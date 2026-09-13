import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { answerCopilotQuery, buildCareerInsights } from "../services/career/careerCopilotService.js";

export const getCareerInsights = async (req, res) => {
  const insights = await buildCareerInsights(req.user.userId);
  res.status(StatusCodes.OK).json({ insights });
};

export const queryCareerCopilot = async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 1000) {
    throw new BadRequestError("message must be between 1 and 1000 characters");
  }
  const result = await answerCopilotQuery(req.user.userId, message);
  res.status(StatusCodes.OK).json(result);
};
