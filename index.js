const { updateZendeskTicket } = require('./requests.js');

exports.handler = async (event) => {
    try {
        const zendeskTicketsUpdated = await updateZendeskTicket();

        const response = {
            statusCode: 200,
            body: JSON.stringify(zendeskTicketsUpdated),
        };
        return response;
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Internal Server Error'),
        };
    }
};
