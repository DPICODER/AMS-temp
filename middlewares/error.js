const express = require('express');
const logger = require('./logger');

const errorHandler = (err, req, res, next) => {
  // ////console.log('Entering Global Error Handler');
  logger.error(`Global Error Handler: ${err}`);

  if (res.headersSent) {
    // ////console.log('Response headers already sent, passing to next error handler');
    return next(err);
  }

  let errorMessage = null;

  // Specific error handling using switch statement
  switch (true) {
    case err.message.includes('SequelizeConnectionError'):
      errorMessage = 'Database connection error. Please try again later.';
      break;
    case err.message.includes('ConnectionRefusedError'):
      errorMessage = 'Cannot connect to the database. Please try again later.';
      break;
    case err.message.includes('ECONNREFUSED'):
      errorMessage = 'Cannot connect to the database. Please try again later.';
      break;
    case err.message.includes('Page Not Found'):
      errorMessage = 'The requested page could not be found.';
      break;
    case err.message.includes('Unauthorized Access'):
      errorMessage = 'You don’t have access to this page.\n';
      break;
    case err.message.includes('Not Authenticated'):
      errorMessage = 'Please log in to continue.';
      break;
    case err.message.includes('Pls login'):
      errorMessage = 'Please log in to continue.';
      break;
    case err.message.includes('is not defined'):
      errorMessage = 'Issue in EJS Rendering.';
      break;
    case err instanceof SyntaxError:
      errorMessage = 'There was a syntax error in your request.';
      break;
    case err instanceof TypeError:
      errorMessage = 'There was a type error in your request.';
      break;
    case err instanceof ReferenceError:
      errorMessage = 'There was a reference error in your request.';
      break;
    case err instanceof RangeError:
      errorMessage = 'There was a range error in your request.';
      break;
    case err instanceof EvalError:
      errorMessage = 'There was an eval error in your request.';
      break;
    case err instanceof URIError:
      errorMessage = 'There was a URI error in your request.';
      break;
    default:
      errorMessage = 'An error occurred. Please log in again.';
  }

  // Append the path to the error message
  errorMessage += `(Path: ${req.path})`;

  // ////console.log('Final error message before rendering:', errorMessage);

  // Clear the error object
  err = null;

  res.render('error', { errorMessage: errorMessage });

};

// Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err}`);
  const req = { path: 'uncaughtException' };
  const res = {
    headersSent: false,
    render: (view, options) => {
      logger.info(`Rendering view ${view} with options:${ options}`);

    }
  };
  errorHandler(err, req, res, () => { });
});

// Unhandled Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  const req = { path: 'unhandledRejection' };
  const res = {
    headersSent: false,
    render: (view, options) => {
      logger.info(`Rendering view ${view} with options:${ options}`);
    }
  };
  errorHandler(reason, req, res, () => { });
});

module.exports = errorHandler;
