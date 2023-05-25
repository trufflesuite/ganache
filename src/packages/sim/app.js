document.addEventListener('DOMContentLoaded', () => {
    const transactions = document.getElementById('transactions');
    const transactionTemplate = document.getElementsByClassName('transaction')[0].cloneNode(true);

    const addTransactionButton = document.getElementById('add-transaction');
    addTransactionButton.addEventListener('click', () => {
        // close any other `open` `.transaction details`:
        const openTransaction = transactions.querySelector('.transaction details[open]');
        if (openTransaction) {
            openTransaction.removeAttribute('open');
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
        const advancedOptions = document.getElementsByClassName('advanced-container')[0];
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


        document.getElementById("requestBody").innerHTML = JSON.stringify(json, null, 2);
    }
    // whenever a transaction field is changed collect all the data form all
    // transactions and generate the JSON RPC json for the
    // `evm_simulateTransactions` call:
    transactions.addEventListener('change', formatJson);
    formatJson();


    document.querySelector("form").addEventListener('submit', async (event) => {
        debugger;
        event.preventDefault();

        const jsonRPC = JSON.parse(document.getElementById("requestBody").innerHTML);
        try {
            const response = await fetch('/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'applicaiton/json',
                },
                body: JSON.stringify(jsonRPC),
            });

            const result = await response.json();
            document.getElementById("responseBody").innerHTML = JSON.stringify(result, null, 2);
        } catch (error) {
            console.error(error);
        }
    });
});
