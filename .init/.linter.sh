#!/bin/bash
cd /home/kavia/workspace/code-generation/weekly-progress-insights-platform-22351-22360/weekly_report_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

