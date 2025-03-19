#!/bin/bash

# Change to the directory where the script is located
cd -- "$(dirname "$BASH_SOURCE")"

# Define colors for terminal output
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Print header
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Business Manager Startup Script    ${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if application directories exist
if [ ! -d "business-manager" ]; then
    echo -e "${RED}Error: business-manager directory not found${NC}"
    exit 1
fi

if [ ! -d "business-manager/backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

# Start backend server with nohup to persist even after closing terminal
echo -e "${YELLOW}Starting backend server...${NC}"
cd business-manager/backend
nohup npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend server started with PID: $BACKEND_PID${NC}"

# Return to project root
cd ../..

# Start frontend development server with nohup
echo -e "${YELLOW}Starting frontend server...${NC}"
cd business-manager
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

# Display access information
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Backend API: http://localhost:3001${NC}"
echo -e "${GREEN}Frontend App: http://localhost:5173${NC}"
echo -e "${BLUE}======================================${NC}"

# Setup trap to handle script termination
trap "echo -e \"${YELLOW}Shutting down servers...${NC}\"; kill $BACKEND_PID $FRONTEND_PID; echo -e \"${GREEN}Servers stopped${NC}\"; exit" INT TERM

# Keep script running
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
nohup wait & 
