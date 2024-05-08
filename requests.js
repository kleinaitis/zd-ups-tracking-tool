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
    const query = encodeURIComponent(process.env.CUSTOM_FIELD)

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

    for (const ticket of tickets) {
        let ticketObject = {
            ticketid: ticket["id"],
            upsTrackingID: ticket["custom_fields"][0]["value"],
            shipmentStatus: ""
        }
        ticketInfo.push(ticketObject)
    }
    return ticketInfo;

}

async function getUPSTrackingStatus() {
    const ticketList = await getTicketSearchResults();
    const upsAccessToken = await generateUPSToken();

    for (const ticket of ticketList) {
        const response = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${ticket.upsTrackingID}`, {
            method: "GET",
            redirect: "follow",
            headers: {
                transId: '1234',
                transactionSrc: 'testing',
                Authorization: `Bearer ${upsAccessToken}`
            },
        });
        const data = await response.json();
        ticket.shipmentStatus = data.trackResponse.shipment[0].package[0].currentStatus.description
        console.log(ticket)
    }
}

getUPSTrackingStatus();