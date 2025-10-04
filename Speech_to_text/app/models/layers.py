import torch
import torch._VF as _VF
import torch.nn as nn
import torch.nn.functional as F

# Activation Functions
from torch.nn.modules.utils import _pair


class Linear(nn.Linear):
    def __init__(self, in_features, out_features, bias=True):
        super(Linear, self).__init__(in_features=in_features, out_features=out_features, bias=bias)

        # Variational Noise
        self.noise = None
        self.vn_std = None

    def init_vn(self, vn_std):
        # Variational Noise
        self.vn_std = vn_std

    def sample_synaptic_noise(self, distributed):
        # Sample Noise
        self.noise = torch.normal(mean=0.0, std=1.0, size=self.weight.size(), device=self.weight.device, dtype=self.weight.dtype)

        # Broadcast Noise
        if distributed:
            torch.distributed.broadcast(self.noise, 0)

    def forward(self, input):
        # Weight
        weight = self.weight

        # Add Noise
        if self.noise is not None and self.training:
            weight = weight + self.vn_std * self.noise

        # Apply Weight
        return F.linear(input, weight, self.bias)


class Conv1d(nn.Conv1d):
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding="same", dilation=1, groups=1, bias=True):
        super(Conv1d, self).__init__(in_channels=in_channels, out_channels=out_channels, kernel_size=kernel_size, stride=stride, padding=0, dilation=dilation, groups=groups, bias=bias, padding_mode="zeros")

        # Assert
        assert padding in ["valid", "same", "causal"]

        # Padding
        if padding == "valid":
            self.pre_padding = None
        elif padding == "same":
            self.pre_padding = nn.ConstantPad1d(padding=((kernel_size - 1) // 2, (kernel_size - 1) // 2), value=0)
        elif padding == "causal":
            self.pre_padding = nn.ConstantPad1d(padding=(kernel_size - 1, 0), value=0)

        # Variational Noise
        self.noise = None
        self.vn_std = None

    def init_vn(self, vn_std):
        # Variational Noise
        self.vn_std = vn_std

    def sample_synaptic_noise(self, distributed):
        # Sample Noise
        self.noise = torch.normal(mean=0.0, std=1.0, size=self.weight.size(), device=self.weight.device, dtype=self.weight.dtype)

        # Broadcast Noise
        if distributed:
            torch.distributed.broadcast(self.noise, 0)

    def forward(self, input):
        # Weight
        weight = self.weight

        # Add Noise
        if self.noise is not None and self.training:
            weight = weight + self.vn_std * self.noise

        # Padding
        if self.pre_padding is not None:
            input = self.pre_padding(input)

        # Apply Weight
        return F.conv1d(input, weight, self.bias, self.stride, self.padding, self.dilation, self.groups)

class LSTM(nn.LSTM):
    def __init__(self, input_size, hidden_size, num_layers, batch_first, bidirectional):
        super(LSTM, self).__init__(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers, batch_first=batch_first, bidirectional=bidirectional)

        # Variational Noise
        self.noises = None
        self.vn_std = None

    def init_vn(self, vn_std):
        # Variational Noise
        self.vn_std = vn_std

    def sample_synaptic_noise(self, distributed):
        # Sample Noise
        self.noises = []
        for i in range(0, len(self._flat_weights), 4):
            self.noises.append(torch.normal(mean=0.0, std=1.0, size=self._flat_weights[i].size(), device=self._flat_weights[i].device, dtype=self._flat_weights[i].dtype))
            self.noises.append(torch.normal(mean=0.0, std=1.0, size=self._flat_weights[i + 1].size(), device=self._flat_weights[i + 1].device, dtype=self._flat_weights[i + 1].dtype))

        # Broadcast Noise
        if distributed:
            for noise in self.noises:
                torch.distributed.broadcast(noise, 0)

    def forward(self, input, hx=None):  # noqa: F811
        orig_input = input
        # xxx: isinstance check needs to be in conditional for TorchScript to compile
        if isinstance(orig_input, nn.utils.rnn.PackedSequence):
            input, batch_sizes, sorted_indices, unsorted_indices = input
            max_batch_size = batch_sizes[0]
            max_batch_size = int(max_batch_size)
        else:
            batch_sizes = None
            max_batch_size = input.size(0) if self.batch_first else input.size(1)
            sorted_indices = None
            unsorted_indices = None

        if hx is None:
            num_directions = 2 if self.bidirectional else 1
            zeros = torch.zeros(self.num_layers * num_directions, max_batch_size, self.hidden_size, dtype=input.dtype, device=input.device)
            hx = (zeros, zeros)
        else:
            # Each batch of the hidden state should match the input sequence that
            # the user believes he/she is passing in.
            hx = self.permute_hidden(hx, sorted_indices)

        # Add Noise
        if self.noises is not None and self.training:
            weight = []
            for i in range(0, len(self.noises), 2):
                weight.append(self._flat_weights[2 * i] + self.vn_std * self.noises[i])
                weight.append(self._flat_weights[2 * i + 1] + self.vn_std * self.noises[i + 1])
                weight.append(self._flat_weights[2 * i + 2])
                weight.append(self._flat_weights[2 * i + 3])
        else:
            weight = self._flat_weights

        self.check_forward_args(input, hx, batch_sizes)
        if batch_sizes is None:
            result = _VF.lstm(input, hx, weight, self.bias, self.num_layers, self.dropout, self.training, self.bidirectional, self.batch_first)
        else:
            result = _VF.lstm(input, batch_sizes, hx, weight, self.bias, self.num_layers, self.dropout, self.training, self.bidirectional)
        output = result[0]
        hidden = result[1:]
        # xxx: isinstance check needs to be in conditional for TorchScript to compile
        if isinstance(orig_input, nn.utils.rnn.PackedSequence):
            output_packed = nn.utils.rnn.PackedSequence(output, batch_sizes, sorted_indices, unsorted_indices)
            return output_packed, self.permute_hidden(hidden, unsorted_indices)
        else:
            return output, self.permute_hidden(hidden, unsorted_indices)


class Transpose(nn.Module):
    def __init__(self, dim0, dim1):
        super(Transpose, self).__init__()
        self.dim0 = dim0
        self.dim1 = dim1

    def forward(self, x):
        return x.transpose(self.dim0, self.dim1)
