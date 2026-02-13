
# Build Report Workflow

This workflow automates the generation of the ESS Retail In Depth Analysis report by running the main generation script and then injecting the specialized modules.

1.  **Generate Base Report**
    Run the main script to process data and create the initial HTML file.
    ```bash
    node generate_report_v4.js
    ```

2.  **Inject Branch Analysis Module**
    Inject the enhanced branch analysis logic (initBranches) into the generated HTML.
    ```bash
    node inject_branches.js
    ```

3.  **Inject Store Deep Dive Module**
    Inject the enhanced store list and deep dive logic (renderStoreList, etc.) into the generated HTML.
    ```bash
    node inject_store_list.js
    ```

4.  **Inject Voice of Customer Module**
    Inject the Voice of Customer analysis UI and logic.
    ```bash
    node inject_voc.js
    ```
