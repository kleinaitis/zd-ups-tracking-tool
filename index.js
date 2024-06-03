const { getUPSTrackingStatus } = require('./requests.js');

exports.handler = async (event) => {
    try {
        const trackingStatus = await getUPSTrackingStatus();

        const response = {
            statusCode: 200,
            body: JSON.stringify(trackingStatus),
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
