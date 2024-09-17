#!/bin/bash

# Log file path
LOG_FILE="/var/log/tethys/update_gha.log"

# Usage message
usage() {
    echo "Usage: $0 <app_name> <path_to_app> <nginx_user> <path_to_static_files> <path_to_workspaces> <sudo_password or 'none'> <conda_executable_path> <app_static_files_path> [--skip-static] [--skip-workspaces] [--skip-syncstores]" | tee -a "$LOG_FILE"
    exit 1
}

# Check for the minimum number of arguments
if [ "$#" -lt 8 ]; then
    usage
fi

# Assign required arguments to variables
APP_NAME=$1
APP_PATH=$2
NGINX_USER=$3
STATIC_FILES_PATH=$4
WORKSPACES_PATH=$5
SUDO_PASSWORD=$6
CONDA_EXECUTABLE=$7
APP_STATIC_FILES_PATH=$8  # Path to the static files within the app for change detection

# Default values for flags (false)
SKIP_STATIC=false
SKIP_WORKSPACES=false
SKIP_SYNCSTORES=false

# Parse optional arguments
shift 8  # Shift past the first 8 required arguments
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --skip-static)
        SKIP_STATIC=true
        ;;
        --skip-workspaces)
        SKIP_WORKSPACES=true
        ;;
        --skip-syncstores)
        SKIP_SYNCSTORES=true
        ;;
        *)
        usage
        ;;
    esac
    shift
done

# Function to run sudo commands with or without password
run_sudo() {
    if [ "$SUDO_PASSWORD" = "none" ]; then
        sudo "$@"
    else
        echo "$SUDO_PASSWORD" | sudo -S "$@"
    fi
}

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

    # Run the Tethys install command using the provided Conda executable
    echo "Running tethys install"
    "$CONDA_EXECUTABLE" run -n tethys tethys install -d -N || { echo "Tethys install failed"; exit 1; }

    # Sync stores for the app (if not skipped)
    if [ "$SKIP_SYNCSTORES" = false ]; then
        echo "Syncing stores for $APP_NAME"
        if ! "$CONDA_EXECUTABLE" run -n tethys tethys syncstores "$APP_NAME"; then
            echo "Syncstores failed for $APP_NAME, continuing with the next steps..."
        fi
    else
        echo "Skipping syncstores."
    fi

    # Check for changes in the app's static files directory ($APP_STATIC_FILES_PATH) using git diff
    echo "Checking for changes in app static files at $APP_STATIC_FILES_PATH"
    if [ "$SKIP_STATIC" = false ] && git diff --quiet HEAD^ HEAD -- "$APP_STATIC_FILES_PATH"; then
        echo "No changes detected in app static files. Skipping collectstatic."
    else
        echo "Changes detected in app static files. Running collectstatic."
        echo "Changing ownership of static files to $USER"
        run_sudo chown -R "$USER": "$STATIC_FILES_PATH" || { echo "Chown on static files failed"; exit 1; }
        echo "Running collectstatic"
        "$CONDA_EXECUTABLE" run -n tethys tethys manage collectstatic --noinput || { echo "Collectstatic failed"; exit 1; }
        echo "Reverting ownership of static files back to $NGINX_USER"
        run_sudo chown -R $NGINX_USER: "$STATIC_FILES_PATH" || { echo "Reverting ownership of static files failed"; exit 1; }
    fi

    # Change ownership of workspaces and run collectworkspaces (if not skipped)
    if [ "$SKIP_WORKSPACES" = false ]; then
        echo "Changing ownership of workspaces to $USER"
        run_sudo chown -R "$USER": "$WORKSPACES_PATH" || { echo "Chown on workspaces failed"; exit 1; }
        echo "Running collectworkspaces"
        "$CONDA_EXECUTABLE" run -n tethys tethys manage collectworkspaces --noinput || { echo "Collectworkspaces failed"; exit 1; }
        echo "Reverting ownership of workspaces back to $NGINX_USER"
        run_sudo chown -R $NGINX_USER: "$WORKSPACES_PATH" || { echo "Reverting ownership of workspaces failed"; exit 1; }
    else
        echo "Skipping workspace collection."
    fi

    # Restart supervisor processes
    echo "Restarting supervisor services"
    run_sudo supervisorctl restart all || { echo "Supervisor restart failed"; exit 1; }

    echo "===== Update Process Completed: $(date) ====="
} | tee -a "$LOG_FILE"
