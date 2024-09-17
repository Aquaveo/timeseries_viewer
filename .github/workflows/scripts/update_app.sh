#!/bin/bash

# Log file path
LOG_FILE="/var/log/tethys/update_gha.log"

# Check if exactly 5 arguments are provided
if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <app_name> <path_to_app> <nginx_user> <path_to_static_files> <path_to_workspaces>" | tee -a "$LOG_FILE"
    exit 1
fi

# Assign arguments to variables
APP_NAME=$1
APP_PATH=$2
NGINX_USER=$3
STATIC_FILES_PATH=$4
WORKSPACES_PATH=$5

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Start logging
{
    echo "===== Starting Update Process: $(date) ====="

    # Move to the app directory
    echo "Changing to app directory: $APP_PATH"
    cd "$APP_PATH" || { echo "Directory $APP_PATH not found"; exit 1; }

    # Perform git pull to update the app
    echo "Running git pull"
    git pull || { echo "git pull failed"; exit 1; }

    # Run the Tethys install command
    echo "Running tethys install"
    /home/$USER/miniconda3/envs/tethys/bin/tethys install -d -N || { echo "Tethys install failed"; exit 1; }

    # Sync stores for the app
    echo "Syncing stores for $APP_NAME"

if ! /home/$USER/miniconda3/envs/tethys/bin/tethys syncstores "$APP_NAME"; then
    echo "Syncstores failed for $APP_NAME, continuing with the next steps..."
fi

    # Change ownership of static files and run collectstatic
    echo "Changing ownership of static files to $NGINX_USER"
    chown -R "$NGINX_USER": "$STATIC_FILES_PATH" || { echo "Chown on static files failed"; exit 1; }
    echo "Running collectstatic"


/home/$USER/miniconda3/envs/tethys/bin/tethys manage collectstatic || { echo "Collectstatic failed"; exit 1; }

    # Change ownership of workspaces and run collectworkspaces
    echo "Changing ownership of workspaces to $NGINX_USER"
    chown -R "$NGINX_USER": "$WORKSPACES_PATH" || { echo "Chown on workspaces failed"; exit 1; }
    echo "Running collectworkspaces"
/home/$USER/miniconda3/envs/tethys/bin/tethys manage collectworkspaces || { echo "Collectworkspaces failed"; exit 1; }

    # Reassign ownership back to the user
    echo "Reverting ownership of static files and workspaces back to $USER"
    chown -R $USER: "$STATIC_FILES_PATH" || { echo "Reverting ownership of static files failed"; exit 1; }
    chown -R $USER: "$WORKSPACES_PATH" || { echo "Reverting ownership of workspaces failed"; exit 1; }

    # Restart supervisor processes
    echo "Restarting supervisor services"
    sudo supervisorctl restart all || { echo "Supervisor restart failed"; exit 1; }

    echo "===== Update Process Completed: $(date) ====="
} | tee -a "$LOG_FILE"
