import { OpenAPIHono } from "@hono/zod-openapi";
import { contactRouter } from "./contact";
import { conversationRouter } from "./conversation";
import { messagesRouter } from "./messages";
import { organizationRouter } from "./organization";
import { visitorRouter } from "./visitor";
import { websiteRouter } from "./website";
import { uploadRouter } from "./upload";

const routers = new OpenAPIHono()
        .route("/organizations", organizationRouter)
        .route("/websites", websiteRouter)
        .route("/messages", messagesRouter)
        .route("/conversations", conversationRouter)
        .route("/visitors", visitorRouter)
        .route("/contacts", contactRouter)
        .route("/uploads", uploadRouter);

export { routers };
