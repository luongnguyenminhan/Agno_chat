"""
Verification script to confirm model reads configuration parameters from decoding_params.
This script verifies Requirements 8.1-8.6.
"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.models.model_ctc import ModelCTC
import torch


def verify_decoding_params():
    """Verify that ModelCTC correctly reads all decoding parameters."""
    
    print("\033[94m[VERIFY] Starting configuration parameter verification\033[0m")
    print()
    
    # Create minimal test configuration
    encoder_params = {
        "arch": "Conformer",
        "dim_model": 256,
        "num_layers": 12,
        "num_heads": 4,
        "dim_ffn": 1024,
        "kernel_size_conv": 31,
        "dropout": 0.1,
        "dropout_att": 0.1,
        "dropout_conv": 0.1,
        "dropout_ffn": 0.1
    }
    
    tokenizer_params = {
        "tokenizer_path": None,  # Will be None for this test
        "vocab_size": 1024
    }
    
    training_params = {
        "optimizer": "Adam",
        "beta1": 0.9,
        "beta2": 0.98,
        "eps": 1e-9,
        "weight_decay": 0.0,
        "lr_schedule": "Constant",
        "lr_value": 0.001
    }
    
    # Test decoding_params with all expected parameters
    decoding_params = {
        "beam_size": 16,
        "tmp": 1.0,
        "ngram_path": "callbacks/ngram/6gram_256.arpa",
        "ngram_alpha": 0.3,
        "ngram_beta": 1.0,
        "ngram_offset": 100
    }
    
    print("\033[94m[VERIFY] Creating ModelCTC with decoding_params:\033[0m")
    for key, value in decoding_params.items():
        print(f"  {key}: {value}")
    print()
    
    # Create model instance
    try:
        model = ModelCTC(
            encoder_params=encoder_params,
            tokenizer_params=tokenizer_params,
            training_params=training_params,
            decoding_params=decoding_params,
            name="test_model"
        )
        print("\033[92m[VERIFY] ✓ Model created successfully\033[0m")
        print()
    except Exception as e:
        print(f"\033[91m[VERIFY] ✗ Failed to create model: {e}\033[0m")
        return False
    
    # Verify beam_size (Requirement 8.1)
    print("\033[94m[VERIFY] Task 4.1: Verifying beam_size parameter\033[0m")
    try:
        assert hasattr(model, 'beam_size'), "Model does not have beam_size attribute"
        assert model.beam_size == decoding_params["beam_size"], \
            f"beam_size mismatch: expected {decoding_params['beam_size']}, got {model.beam_size}"
        print(f"\033[92m[VERIFY] ✓ model.beam_size = {model.beam_size} (matches config)\033[0m")
        print()
    except AssertionError as e:
        print(f"\033[91m[VERIFY] ✗ beam_size verification failed: {e}\033[0m")
        return False
    
    # Verify ngram parameters (Requirement 8.2-8.6)
    print("\033[94m[VERIFY] Task 4.2: Verifying ngram parameters\033[0m")
    
    ngram_params = {
        "ngram_path": ("ngram_path", decoding_params["ngram_path"]),
        "ngram_alpha": ("ngram_alpha", decoding_params["ngram_alpha"]),
        "ngram_beta": ("ngram_beta", decoding_params["ngram_beta"]),
        "ngram_offset": ("ngram_offset", decoding_params["ngram_offset"]),
        "tmp": ("tmp", decoding_params["tmp"])
    }
    
    all_passed = True
    for param_name, (attr_name, expected_value) in ngram_params.items():
        try:
            assert hasattr(model, attr_name), f"Model does not have {attr_name} attribute"
            actual_value = getattr(model, attr_name)
            assert actual_value == expected_value, \
                f"{attr_name} mismatch: expected {expected_value}, got {actual_value}"
            print(f"\033[92m[VERIFY] ✓ model.{attr_name} = {actual_value} (matches config)\033[0m")
        except AssertionError as e:
            print(f"\033[91m[VERIFY] ✗ {attr_name} verification failed: {e}\033[0m")
            all_passed = False
    
    print()
    
    if not all_passed:
        return False
    
    # Test with default values (when parameters are not specified)
    print("\033[94m[VERIFY] Testing default values when parameters are not specified\033[0m")
    
    decoding_params_minimal = {}
    
    try:
        model_default = ModelCTC(
            encoder_params=encoder_params,
            tokenizer_params=tokenizer_params,
            training_params=training_params,
            decoding_params=decoding_params_minimal,
            name="test_model_default"
        )
        print("\033[92m[VERIFY] ✓ Model created with empty decoding_params\033[0m")
        print()
    except Exception as e:
        print(f"\033[91m[VERIFY] ✗ Failed to create model with defaults: {e}\033[0m")
        return False
    
    # Verify default values
    default_checks = [
        ("beam_size", 1),
        ("tmp", 1),
        ("ngram_path", None),
        ("ngram_alpha", 0),
        ("ngram_beta", 0),
        ("ngram_offset", 100)
    ]
    
    print("\033[94m[VERIFY] Verifying default values:\033[0m")
    for attr_name, expected_default in default_checks:
        try:
            actual_value = getattr(model_default, attr_name)
            assert actual_value == expected_default, \
                f"{attr_name} default mismatch: expected {expected_default}, got {actual_value}"
            print(f"\033[92m[VERIFY] ✓ model.{attr_name} = {actual_value} (correct default)\033[0m")
        except AssertionError as e:
            print(f"\033[91m[VERIFY] ✗ {attr_name} default verification failed: {e}\033[0m")
            return False
    
    print()
    print("\033[92m[VERIFY] ═══════════════════════════════════════════════════════\033[0m")
    print("\033[92m[VERIFY] ✓ ALL CONFIGURATION PARAMETER CHECKS PASSED\033[0m")
    print("\033[92m[VERIFY] ═══════════════════════════════════════════════════════\033[0m")
    print()
    print("\033[94m[VERIFY] Summary:\033[0m")
    print("  ✓ Task 4.1: beam_size parameter verified")
    print("  ✓ Task 4.2: All ngram parameters verified")
    print("    - ngram_path")
    print("    - ngram_alpha")
    print("    - ngram_beta")
    print("    - ngram_offset")
    print("    - tmp (temperature)")
    print("  ✓ Default values verified")
    print()
    
    return True


if __name__ == "__main__":
    success = verify_decoding_params()
    sys.exit(0 if success else 1)
