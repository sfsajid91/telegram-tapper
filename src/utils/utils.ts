import axios from 'axios';
import { fileLogger } from './fileLogger';
import { logger } from './logger';

// Function to handle Axios errors
export const handleAxiosError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        // Axios error
        // fileLogger.error(`Axios error: ${error.message}`);
        if (error.response) {
            // Server responded with a status other than 2xx
            logger.error(`Response status: ${error.response.status}`);
            fileLogger.error({
                stack: error.stack,
                message: `Response data: ${JSON.stringify({
                    data: error.response.data,
                    status: error.response.status,
                })}`,
            });
        } else if (error.request) {
            // Request was made but no response was received
            logger.error('No response received');
            fileLogger.error({
                stack: error.stack,
                message: `AxiosError Request data: ${JSON.stringify(error.request)}`,
            });
        } else {
            // Something happened in setting up the request
            fileLogger.error({
                stack: error.stack,
                message: `AxiosError message: ${error.message}`,
            });
        }
    } else {
        // Non-Axios error
        fileLogger.error(error);
    }
};

export const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
