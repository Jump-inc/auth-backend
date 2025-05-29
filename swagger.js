const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Jump Auth API",
      version: "1.0.0",
      description:
        "Auth endpoints for email verification, DOB validation, user registration, user log in, user password recovery",
    },
    servers: [{ url: "http://localhost:4000" }],
  },
  apis: ["./controllers/authController.js"],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
