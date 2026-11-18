function calculate() {

    const number1 =
        parseFloat(document.getElementById("number1").value);

    const number2 =
        parseFloat(document.getElementById("number2").value);

    const operator =
        document.getElementById("operator").value;

    let result;

    if (isNaN(number1) || isNaN(number2)) {
        document.getElementById("result").innerText =
            "Please enter valid numbers.";
        return;
    }

    if (operator === "+") {
        result = number1 + number2;
    }

    if (operator === "-") {
        result = number1 - number2;
    }

    if (operator === "*") {
        result = number1 * number2;
    }

    if (operator === "/") {

        if (number2 === 0) {
            document.getElementById("result").innerText =
                "Cannot divide by zero.";
            return;
        }

        result = number1 / number2;
    }

    document.getElementById("result").innerText = result;
}


function clearCalculator() {

    document.getElementById("number1").value = "";
    document.getElementById("number2").value = "";

    document.getElementById("result").innerText =
        "No calculation performed";
}