document.addEventListener('DOMContentLoaded', () => {
    const transactions = document.getElementById('transactions');
    const transactionTemplate = document.getElementsByClassName('transaction')[0].cloneNode(true);
    const advancedOptions = document.querySelector('.advanced-container');
    const requestElement = document.getElementById("requestBody");

    const addTransactionButton = document.getElementById('add-transaction');
    addTransactionButton.addEventListener('click', () => {
        // close any other `open` `.transaction details`:
        const openTransaction = transactions.querySelectorAll('.transaction details[open]');
        if (openTransaction.length > 0) {
            openTransaction.forEach(t => t.removeAttribute('open'));
        }

        const newTransaction = transactionTemplate.cloneNode(true);
        transactions.appendChild(newTransaction);
        // focus the first input:
        newTransaction.querySelector('input').focus();
        formatJson();
    });

    transactions.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-transaction')) {
            event.preventDefault();
            const transaction = event.target.closest('.transaction');
            if (transactions.children.length === 1) {
                transaction.replaceWith();
            } else {
                transaction.remove();
            }
            formatJson();
        }
    });

    function formatJson() {
        const json = {
            jsonrpc: '2.0',
            method: 'evm_simulateTransactions',
            params: [{
                transactions: [],
                block: 'latest'
            }],
            id: 1
        };
        transactions.querySelectorAll('.transaction').forEach(transaction => {
            const tx = {};
            transaction.querySelectorAll("input, select").forEach((element) => {
                const value = element.value.trim();
                if (value) {
                    if ("SELECT" === element.tagName) {
                        tx[element.name] = value;
                    } else {
                        if (element.getAttribute("pattern")) {
                            tx[element.name] = value.toLowerCase().startsWith("0x") ? value : "0x" + parseInt(value).toString(16);
                        } else {
                            tx[element.name] = value.trim();
                        }
                    }
                }
            });
            json.params[0].transactions.push(tx);
        });
        // also collect all of the advanced options:
        advancedOptions.querySelectorAll("input, select").forEach((element) => {
            const value = element.value.trim();
            if (value) {
                if ("SELECT" === element.tagName) {
                    json.params[0][element.name] = value;
                } else {
                    if (element.getAttribute("pattern")) {
                        if (element.name === "block" && value.toLowerCase() === "latest") {
                            json.params[0][element.name] = "latest";
                        } else {
                            json.params[0][element.name] = value.toLowerCase().startsWith("0x") ? value : "0x" + parseInt(value).toString(16);
                        }
                    } else {
                        json.params[0][element.name] = value.trim();
                    }
                }
            }
        });


        requestElement.innerHTML = "";
        const tree = jsonview.create(json);
        jsonview.render(tree, requestElement);
        jsonview.expand(tree);
        requestElement.dataset.json = JSON.stringify(json);
    }
    // whenever a transaction field is changed collect all the data form all
    // transactions and generate the JSON RPC json for the
    // `evm_simulateTransactions` call:
    transactions.addEventListener('change', formatJson);
    advancedOptions.addEventListener('change', formatJson);
    formatJson();

    const responseElement = document.getElementById("responseBody");
    document.querySelector("form").addEventListener('submit', async (event) => {
        event.preventDefault();
        // disable the submit button:
        document.querySelector("form button").disabled = true;

        // show a loading spinner in the `responseBody` element:
        responseElement.innerHTML = '<div class="loader"></div>';
        try {
            const jsonRPC = JSON.parse(requestElement.dataset.json);

            const response = await fetch('/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'applicaiton/json',
                },
                body: JSON.stringify(jsonRPC),
            });

            responseElement.innerHTML = '';
            const result = await response.json();
            const tree = jsonview.create(result);
            jsonview.render(tree, responseElement);
            jsonview.expand(tree);
        } catch (e) {
            responseElement.innerText = e.message ? e.message : e;
        } finally {

            //re-enable the submit button:
            document.querySelector("form button").disabled = false;
        }
    });
});
