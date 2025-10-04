import os

import torch

from app.models.model_ctc import ModelCTC


def create_model(config_data):
    """
    Create a speech-to-text model from configuration data.

    Args:
        config_data: Configuration data (dict) loaded from JSON file

    Returns:
        Model instance ready for inference
    """
    print("\033[94m[S2T] Creating model from config data\033[0m")

    # Extract parameters from config
    encoder_params = config_data["encoder_params"]
    tokenizer_params = config_data["tokenizer_params"]
    training_params = config_data["training_params"]
    decoding_params = config_data["decoding_params"]

    # Create model
    print(f"\033[94m[S2T] Creating model with {len(encoder_params)} encoder params, vocab_size: {tokenizer_params.get('vocab_size', 'unknown')}\033[0m")
    model = ModelCTC(encoder_params=encoder_params, tokenizer_params=tokenizer_params, training_params=training_params, decoding_params=decoding_params, name=config_data["model_name"])

    print("\033[92m[S2T] Model created successfully\033[0m")
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

    # Handle variable length by padding to multiple of 360 (based on model architecture)
    target_divisor = 360
    seg_samples = audio_tensor.shape[1]
    remainder = seg_samples % target_divisor

    if remainder > 0:
        pad_samples = target_divisor - remainder
        print(f"\033[94m[S2T] Padding audio from {seg_samples} to {seg_samples + pad_samples} samples\033[0m")
        audio_tensor = torch.nn.functional.pad(audio_tensor, (0, pad_samples), "constant", 0)

    # Create length tensor
    x_len = torch.tensor([seg_samples], device=device)

    # Run inference
    print("\033[94m[S2T] Running inference...\033[0m")
    with torch.no_grad():
        try:
            transcription = model.gready_search_decoding(audio_tensor.to(device), x_len)
            print(f"\033[94m[S2T] Transcription: {transcription}\033[0m")

            # Handle case where transcription is a list (batch processing)
            if isinstance(transcription, list):
                result = transcription[0] if transcription else ""
            else:
                result = transcription

            result = result.lower().strip()
            print(f"\033[92m[S2T] Transcription completed: '{result}'\033[0m")
            return result
        except Exception as e:
            print(f"\033[91m[S2T] ERROR during transcription: {e}\033[0m")
            return ""
