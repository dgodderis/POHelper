# PO Helper

A simple tool to help Product Owners organize their work.

## Installation

1.  **Create a virtual environment:**

    ```bash
    uv venv
    ```

2.  **Activate the virtual environment:**

    -   On Windows:
        ```bash
        .\.venv\Scripts\activate
        ```
    -   On macOS and Linux:
        ```bash
        source .venv/bin/activate
        ```

3.  **Install the dependencies:**

    ```bash
    uv pip install -r requirements.txt
    ```

## Running the application

1.  **Start the server:**

    ```bash
    uvicorn main:app --reload
    ```

2.  **Open your browser:**

    Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000)