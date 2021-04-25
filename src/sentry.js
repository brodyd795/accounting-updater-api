import Sentry from '@sentry/node';

export const init = () => {
    Sentry.init({
        dsn: process.env.SENTRY_DSN
    });
};
