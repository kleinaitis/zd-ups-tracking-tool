require('dotenv').config();


async function generateUPSToken() {

    const formData = {
        grant_type: 'client_credentials'
    };

    const response = await fetch('https://onlinetools.ups.com/security/v1/oauth/token', {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`)
        },
        body: new URLSearchParams(formData).toString()

    });
    const data = await response.json();
    return data["access_token"];
}


async function getTicketSearchResults() {
    const query = encodeURIComponent(`${process.env.CUSTOM_FIELD_QUERY} status<solved`);

    const response = await fetch(`https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search?query=${query}`, {
        method: "GET",
        redirect: "follow",
        headers: {
            "Authorization": `Basic ${process.env.ZENDESK_CREDENTIALS}`,
            "Accept": "application/json",
        },
    });

    const responseData = await response.json();
    const tickets = responseData.results;

    const ticketInfo = []
    const zendeskCustomFieldID = parseInt(process.env.CUSTOM_FIELD_ID);

    for (const ticket of tickets) {
        let upsTrackingID = null;

        for (const customField of ticket.custom_fields) {
            if (customField.id === zendeskCustomFieldID) {
             upsTrackingID = customField.value
            break
            }
        }
        let ticketObject = {
            ticketid: ticket["id"],
            upsTrackingID: upsTrackingID,
            shipmentStatus: ""
        }
        if (upsTrackingID !== '' && upsTrackingID !== null) {
            ticketInfo.push(ticketObject)
        }
    }
    return ticketInfo;
}

async function getUPSTrackingStatus() {
    const ticketList = await getTicketSearchResults();
    const upsAccessToken = await generateUPSToken();

    for (const ticket of ticketList) {
        try {
            const response = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${ticket.upsTrackingID}`, {
                method: "GET",
                redirect: "follow",
                headers: {
                    transId: '1234',
                    transactionSrc: 'testing',
                    Authorization: `Bearer ${upsAccessToken}`
                },
            });
            if (response.ok) {
                const data =  await response.json();
                ticket.shipmentStatus = data.trackResponse.shipment[0].package[0].currentStatus.description
            } else {
                ticketList.pop()
            }
        } catch (error) {
            console.error('Error fetching UPS API:', error);
        }
    }
        return ticketList;
}
async function updateZendeskTicket() {
    const ticketList = await getUPSTrackingStatus();
    const results = [];

    for (const ticket of ticketList) {
        const custom_status = ticket.shipmentStatus !== "Delivered" ? ticket.upsTrackingID : "";
        const openStatuses = ["On the Way", "Delivered", "Delay"];

        const body = JSON.stringify({
            "ticket": {
                "comment": {
                    "body": `UPS Tracking Tool:\n ${ticket.upsTrackingID} is "${ticket.shipmentStatus}"`,
                    "public": false
                },
                "custom_fields": [{"id": `${process.env.CUSTOM_FIELD_ID}`, "value":`${custom_status}`}],
                "status": openStatuses.includes(ticket.shipmentStatus) ? "open" : "hold"
            }
        })

        try {
            const response = await fetch(`https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticket.ticketid}`, {
                method: "PUT",
                redirect: "follow",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${process.env.ZENDESK_CREDENTIALS}`,
                    "Accept": "application/json",
                },
                body: body
            });

            if (!response.ok) {
                console.error(`Failed to update ticket ${ticket.ticketid}. Status: ${response.status}`);
            } else {
                const data = await response.json();
                results.push(data); // Collect the results
            }
        } catch (error) {
            console.error(`Error updating ticket ${ticket.ticketid}:`, error.message);
        }
    }

    return results;
}
module.exports = { updateZendeskTicket };
