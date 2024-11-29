# Bagel fine tuning

## Setup

Go to [bakery.bagel.net](https://bakery.bagel.net) and create an account. Then get an API key.

Set the `BAGEL_API_KEY` environment variable to your API key.

In bakery, create your model and fine-tune dataset.

## Fine-tune with Eliza

```bash
curl -X POST http://localhost:3000/fine-tune \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jvBpxrTNqGqhnfQhSEqCdsG6aTSP8IBL" \
  -d '{
    "dataset_type": "MODEL",
    "title": "smollm2-fine-tuning-00000099",
    "category": "AI",
    "details": "Test",
    "tags": [],
    "user_id": "96c633e6-e973-446e-b782-6235324c0a56",
    "fine_tune_payload": {
      "asset_id": "d0a3f665-c207-4ee6-9daa-0cbdb272eeca",
      "model_name": "llama3-fine-tuning-00000001",
      "base_model": "0488b40b-829f-4c3a-9880-d55d76775dd1",
      "file_name": "qa_data.csv",
      "epochs": 1,
      "learning_rate": 0.01,
      "user_id": "96c633e6-e973-446e-b782-6235324c0a56",
      "use_ipfs": "false",
      "input_column": "question",
      "output_column": "answer"
    }
  }'
```

This can take a while to complete. You can check the status of the fine-tune job in the bakery dashboard. When it is complete, you can download the fine-tuned model here:

```bash
curl -X GET "http://localhost:3000/fine-tune/8566c47a-ada8-441c-95bc-7bb07656c4c1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jvBpxrTNqGqhnfQhSEqCdsG6aTSP8IBL".
```
