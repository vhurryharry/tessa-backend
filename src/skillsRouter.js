const { Router } = require("express");

const {
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
} = require("./httpErrors");
const { collectionEnvelope, itemEnvelope } = require("./responseEnvelopes");
const {
  findSkill,
  listSkills,
  createSkill,
  updateSkill,
} = require("./skillsService");
const { isAuthor } = require("./authMiddleware");
const { isValidId, isNonWhitespaceOnlyString } = require("./validators");

const skillsRouter = new Router();

skillsRouter.get("/", async (req, res, next) => {
  let skills;
  try {
    skills = await listSkills();
  } catch (e) {
    next(e);
    return;
  }
  res.json(collectionEnvelope(skills, skills.length));
});

skillsRouter.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  const skillId = Number(id);
  if (!isValidId(skillId)) {
    next(new BadRequestError(`"${id}" is not a valid skill id.`));
    return;
  }
  let skill;
  try {
    skill = await findSkill(skillId);
  } catch (e) {
    next(e);
    return;
  }
  if (!skill) {
    next(new NotFoundError(`A skill with the id "${id}" could not be found.`));
    return;
  }
  res.json(itemEnvelope(skill));
});

skillsRouter.post("/", isAuthor(), async (req, res, next) => {
  const { userId } = req.session;
  if (
    typeof req.body !== "object" ||
    !("name" in req.body) ||
    !("description" in req.body)
  ) {
    next(
      new UnprocessableEntityError(
        'The request body must be an object with "name" and "description" properties.'
      )
    );
    return;
  }
  const { name, description } = req.body;
  if (!isNonWhitespaceOnlyString(name)) {
    next(new UnprocessableEntityError('"name" must contain text.'));
    return;
  }
  if (!isNonWhitespaceOnlyString(description)) {
    next(new UnprocessableEntityError('"description" must contain text.'));
    return;
  }
  let skill;
  try {
    skill = await createSkill(name, description, userId);
  } catch (e) {
    next(e);
    return;
  }
  res.status(201).json(itemEnvelope(skill));
});

skillsRouter.put("/:id", isAuthor(), async (req, res, next) => {
  const { userId } = req.session;
  const { id } = req.params;
  const skillId = Number(id);
  if (!isValidId(skillId)) {
    next(new BadRequestError(`"${id}" is not a valid skill id.`));
    return;
  }
  let skillExists;
  try {
    skillExists = await findSkill(skillId);
  } catch (e) {
    next(e);
    return;
  }
  if (!skillExists) {
    next(new NotFoundError(`A skill with the id "${id}" could not be found.`));
    return;
  }
  if (
    typeof req.body !== "object" ||
    !("name" in req.body) ||
    !("description" in req.body)
  ) {
    next(
      new UnprocessableEntityError(
        'The request body must be an object with "name" and "description" properties.'
      )
    );
    return;
  }
  const { name, description } = req.body;
  if (!isNonWhitespaceOnlyString(name)) {
    next(new UnprocessableEntityError('"name" must contain text.'));
    return;
  }
  if (!isNonWhitespaceOnlyString(description)) {
    next(new UnprocessableEntityError('"description" must contain text.'));
    return;
  }
  let skill;
  try {
    skill = await updateSkill(skillId, name, description, userId);
  } catch (e) {
    next(e);
    return;
  }
  res.json(itemEnvelope(skill));
});

module.exports = skillsRouter;
