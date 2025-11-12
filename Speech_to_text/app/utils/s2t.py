import torch

from app.models.model_ctc import ModelCTC


def create_model(config_data):
    model = ModelCTC(encoder_params=config_data["encoder_params"], tokenizer_params=config_data["tokenizer_params"], training_params=config_data["training_params"], decoding_params=config_data["decoding_params"], name=config_data["model_name"])
    return model


def transcribe_audio_segment(model, audio_tensor, device="cpu"):
    """
    Transcribe an audio segment using the loaded model.

    Args:
        model: Loaded speech-to-text model
        audio_tensor: Audio tensor (should be 1D or 2D with shape [channels, samples])
        device: Device to run inference on

    Returns:
        Transcribed text
    """
    print(f"\033[94m[S2T] Starting transcription of audio segment with shape: {audio_tensor.shape}\033[0m")

    # Ensure audio is in the right format
    if audio_tensor.dim() == 1:
        print("\033[94m[S2T] Adding channel dimension to 1D audio\033[0m")
        audio_tensor = audio_tensor.unsqueeze(0)  # Add channel dimension
    elif audio_tensor.dim() == 2 and audio_tensor.shape[0] > 1:
        print(f"\033[93m[S2T] Converting stereo to mono (channels: {audio_tensor.shape[0]})\033[0m")
        # Convert stereo to mono
        audio_tensor = audio_tensor.mean(dim=0, keepdim=True)

    # Check if audio is too long and split into chunks
    max_samples = 256000  # Based on train_audio_max_length from config
    audio_length = audio_tensor.shape[1]

    if audio_length > max_samples:
        print(f"\033[93m[S2T] Audio too long ({audio_length} samples), splitting into chunks\033[0m")
        chunk_size = max_samples
        overlap = 16000  # 1 second overlap at 16kHz
        chunks = []

        start = 0
        while start < audio_length:
            end = min(start + chunk_size, audio_length)
            chunk = audio_tensor[:, start:end]
            chunks.append(chunk)
            start = end - overlap if end < audio_length else end

        print(f"\033[94m[S2T] Split into {len(chunks)} chunks\033[0m")

        # Transcribe each chunk
        transcriptions = []
        for i, chunk in enumerate(chunks):
            print(f"\033[94m[S2T] Transcribing chunk {i+1}/{len(chunks)} with shape: {chunk.shape}\033[0m")
            transcription = _transcribe_single_chunk(model, chunk, device)
            if transcription:
                transcriptions.append(transcription)

        # Combine transcriptions
        result = " ".join(transcriptions).strip()
        print(f"\033[92m[S2T] Combined transcription: '{result}'\033[0m")
        return result
    else:
        return _transcribe_single_chunk(model, audio_tensor, device)


def _transcribe_single_chunk(model, audio_tensor, device="cpu"):
    """
    Transcribe a single audio chunk.
    """
    # Create length tensor
    x_len = torch.tensor([audio_tensor.shape[1]], device=device)

    # Run inference
    print("\033[94m[S2T] Running inference...\033[0m")
    with torch.no_grad():
        try:
            transcription = model.greedy_search_decoding(audio_tensor.to(device), x_len)
            print(f"\033[94m[S2T] Transcription: {transcription}\033[0m")

            # Handle case where transcription is a list (batch processing)
            if isinstance(transcription, list):
                result = transcription[0] if transcription else ""
            else:
                result = transcription

            # Handle None result from tokenizer error
            if result is None:
                print("\033[91m[S2T] ERROR: Transcription returned None (tokenizer not available)\033[0m")
                return ""

            result = result.lower().strip()
            print(f"\033[92m[S2T] Transcription completed: '{result}'\033[0m")
            return result
        except Exception as e:
            print(f"\033[91m[S2T] ERROR during transcription: {e}\033[0m")
            return ""
