import torch
import torch.nn as nn

from app.models.encoders import ConformerEncoder
from app.models.losses import LossCTC
from app.models.model import Model


class ModelCTC(Model):
    def __init__(self, encoder_params, tokenizer_params, training_params, decoding_params, name):
        super(ModelCTC, self).__init__(tokenizer_params, training_params, decoding_params, name)

        # Encoder
        if encoder_params["arch"] == "Conformer":
            self.encoder = ConformerEncoder(encoder_params)
        else:
            raise Exception("Unknown encoder architecture:", encoder_params["arch"])

        # FC Layer
        self.fc = nn.Linear(encoder_params["dim_model"][-1] if isinstance(encoder_params["dim_model"], list) else encoder_params["dim_model"], tokenizer_params["vocab_size"])

        # Criterion
        self.criterion = LossCTC()

        # Compile
        self.compile(training_params)

    def forward(self, batch):
        # Unpack Batch
        x, _, x_len, _ = batch

        # Forward Encoder (B, Taud) -> (B, T, Denc)
        logits, logits_len, attentions = self.encoder(x, x_len)

        # FC Layer (B, T, Denc) -> (B, T, V)
        logits = self.fc(logits)

        return logits, logits_len, attentions

    def distribute_strategy(self, rank):
        super(ModelCTC, self).distribute_strategy(rank)

        self.encoder = torch.nn.SyncBatchNorm.convert_sync_batchnorm(self.encoder)
        self.encoder = torch.nn.parallel.DistributedDataParallel(self.encoder, device_ids=[self.rank])
        self.fc = torch.nn.parallel.DistributedDataParallel(self.fc, device_ids=[self.rank])

    def load_encoder(self, path):
        # Load Encoder Params
        checkpoint = torch.load(path, map_location=next(self.parameters()).device)
        if checkpoint["is_distributed"] and not self.is_distributed:
            self.encoder.load_state_dict({key.replace(".module.", ".").replace("encoder.", ""): value for key, value in checkpoint["model_state_dict"].items() if key[: len("encoder")] == "encoder"})
        else:
            self.encoder.load_state_dict({key.replace("encoder.", ""): value for key, value in checkpoint["model_state_dict"].items() if key[: len("encoder")] == "encoder"})

        # Print Encoder state
        if self.rank == 0:
            print("Model encoder loaded at step {} from {}".format(checkpoint["model_step"], path))

    def gready_search_decoding(self, x, x_len):
        # Forward Encoder (B, Taud) -> (B, T, Denc)
        logits, logits_len = self.encoder(x, x_len)[:2]

        # FC Layer (B, T, Denc) -> (B, T, V)
        logits = self.fc(logits)

        # Softmax -> Log > Argmax -> (B, T)
        preds = logits.log_softmax(dim=-1).argmax(dim=-1)

        # Batch Pred List
        batch_pred_list = []

        # Batch loop
        for b in range(logits.size(0)):
            # Blank
            blank = False

            # Pred List
            pred_list = []

            # Decoding Loop
            for t in range(logits_len[b]):
                # Blank Prediction
                if preds[b, t] == 0:
                    blank = True
                    continue

                # First Prediction
                if len(pred_list) == 0:
                    pred_list.append(preds[b, t].item())

                # New Prediction
                elif pred_list[-1] != preds[b, t] or blank:
                    pred_list.append(preds[b, t].item())

                # Update Blank
                blank = False

            # Append Sequence
            batch_pred_list.append(pred_list)

        # Decode Sequences
        return self.tokenizer.decode(batch_pred_list)
