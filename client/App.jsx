import React, { useState, useRef } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// Renders errors or successfull transactions on the screen.
function Message({ content }) {
  return <p className="message">{content}</p>;
}

function App() {
  const initialOptions = {
    "client-id": "AePU6KG576DvTcUIhavLewI-4meO8Fd5JHqnpDWvkOftbJ9JbJ1w3cUG_n14yQLR23MBbYMTNtc3xjPy",
    "enable-funding": "",
    "disable-funding": "paylater",
    "data-sdk-integration-source": "integrationbuilder_sc",
  };

  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("10"); 
  const [custom_id, setNameOrCompany] = useState("");
  const [invoice_id, setInvoiceNumber] = useState("");


  return (
    <div className="App">

    <div>
      <img src="http://www.microdome.net/new/wp-content/uploads/2015/10/cropped-caselogo2.png" className="logo" alt="Microdome logo" />
    </div>

    <hr />

    

    <div className="container">

    <p>Enter the <strong>First and Last Name, or Company Name</strong> on your account:</p>

    <input placeholder="Name or Company Name" value={custom_id} onChange={(e) => setNameOrCompany(e.target.value)}/>

    <p>Enter the <strong>Invoice, Service Order, or Statement Number</strong>. If you do not have a number, please give a brief description to help us locate your account:</p>

    <input placeholder="Invoice Number" value={invoice_id} onChange={(e) => setInvoiceNumber(e.target.value)}/>

    <p>Enter the <strong>Dollar Amount</strong> you are paying today:</p>
      
    $ <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
       
    <hr />
      
    <p>You may pay with <strong>PayPal or debit/credit card</strong>.</p>

    </div>


      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          forceReRender={[amount, custom_id, invoice_id]}
          style={{
            shape: "rect",
            color:'blue', //change the default color of the buttons
            layout: "vertical", //default value. Can be changed to horizontal
          }}
          createOrder={async () => {
            try {

              console.log("Amount:", amount);
              console.log("Custom ID:", custom_id);
              console.log("Invoice ID:", invoice_id);

              const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                // use the "body" param to optionally pass additional order information
                // like product ids and quantities
                body: JSON.stringify({
                  cart: [
                    {
                      //id: "ONLINE_PAYMENT",
                      //quantity: "1",
                      value: amount,
                      custom_id: custom_id,
                      invoice_id: invoice_id,
                    },
                  ],
                }),
              });

              const orderData = await response.json();

              if (orderData.id) {
                return orderData.id;
              } else {
                const errorDetail = orderData?.details?.[0];
                const errorMessage = errorDetail
                  ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                  : JSON.stringify(orderData);

                throw new Error(errorMessage);
              }
            } catch (error) {
              console.error(error);
              setMessage(`Could not initiate PayPal Checkout...${error}`);
            }
          }}
          onApprove={async (data, actions) => {
            try {
              const response = await fetch(
                `/api/orders/${data.orderID}/capture`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );

              const orderData = await response.json();
              // Three cases to handle:
              //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
              //   (2) Other non-recoverable errors -> Show a failure message
              //   (3) Successful transaction -> Show confirmation or thank you message

              const errorDetail = orderData?.details?.[0];

              if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
                return actions.restart();
              } else if (errorDetail) {
                // (2) Other non-recoverable errors -> Show a failure message
                throw new Error(
                  `${errorDetail.description} (${orderData.debug_id})`,
                );
              } else {
                // (3) Successful transaction -> Show confirmation or thank you message
                // Or go to another URL:  actions.redirect('thank_you.html');
                const transaction =
                  orderData.purchase_units[0].payments.captures[0];
                setMessage(
                  `Transaction ${transaction.status}: ${transaction.id}.`,
                );
                console.log(
                  "Capture result",
                  orderData,
                  JSON.stringify(orderData, null, 2),
                );
              }
            } catch (error) {
              console.error(error);
              setMessage(
                `Sorry, your transaction could not be processed...${error}`,
              );
            }
          }}
        />
      </PayPalScriptProvider>
      <Message content={message} />
    </div>
  );
}

export default App;
