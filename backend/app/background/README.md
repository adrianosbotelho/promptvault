# Background Workers

This module contains background workers that run periodically to perform automated tasks.

## Agent Worker

The `AgentWorker` automatically analyzes the latest prompts every 5 minutes using the `AgentService`.

### Features

- **Automatic Analysis**: Analyzes the top 5 latest prompts every 5 minutes
- **Non-blocking**: Runs asynchronously in the background without blocking the API
- **Error Handling**: Continues processing even if individual prompts fail
- **Configurable**: Can be enabled/disabled via `WORKER_ENABLED` flag

### Configuration

Edit `backend/app/background/agent_worker.py` to configure:

```python
ANALYSIS_INTERVAL_MINUTES = 5  # How often to run (in minutes)
MAX_PROMPTS_TO_ANALYZE = 5     # Number of latest prompts to analyze
WORKER_ENABLED = True           # Enable/disable the worker
```

### How It Works

1. Worker starts automatically when the FastAPI application starts
2. Every 5 minutes, it:
   - Gets the latest prompts (sorted by `updated_at`)
   - Analyzes each prompt using `AgentService`
   - Logs the results (improvements, patterns, warnings)
3. Worker stops gracefully when the application shuts down

### Logging

The worker logs:
- Startup/shutdown messages
- Analysis progress
- Results summary (improvements, patterns, warnings count)
- Errors (with full traceback)

### Disabling the Worker

Set `WORKER_ENABLED = False` in `agent_worker.py` to disable the worker without removing the code.
