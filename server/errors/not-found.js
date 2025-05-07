import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./CustomAPIError.js";

class NotFoundError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.BAD_REQUEST;
  }
}
export default NotFoundError;
