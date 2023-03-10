const { Router } = require("express");

const { BadRequestError } = require("./httpErrors");
const { createUser, findUserByGithubId } = require("./usersService");
const {
  getAccessToken,
  getGithubUser,
  isTeamMember,
} = require("./githubService");
const { itemEnvelope } = require("./responseEnvelopes");

const authRouter = new Router();

authRouter.get("/github/login", (req, res) => {
  const params = new URLSearchParams();
  params.set("client_id", process.env.GITHUB_CLIENT_ID);
  params.set("redirect_uri", process.env.GITHUB_REDIRECT_URI);
  params.set("scope", ["read:org"].join(" "));
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

authRouter.get("/github/oauth/callback", async (req, res, next) => {
  const { code } = req.query;
  if (!code) {
    next(new BadRequestError('A "code" query string parameter is required.'));
    return;
  }
  let accessToken;
  try {
    accessToken = await getAccessToken(code);
  } catch (e) {
    next(e);
    return;
  }
  let githubUser;
  try {
    githubUser = await getGithubUser(accessToken);
  } catch (e) {
    next(e);
    return;
  }
  let user;
  try {
    user = await findUserByGithubId(githubUser.id);
  } catch (e) {
    next(e);
    return;
  }
  if (!user) {
    try {
      user = await createUser(githubUser.id, githubUser.login);
    } catch (e) {
      next(e);
      return;
    }
  }
  req.session.userId = String(user.id);
  req.session.githubUsername = user.github_username;
  req.session.accessToken = accessToken;
  res.redirect(process.env.WEBAPP_ORIGIN);
});

authRouter.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect(process.env.WEBAPP_ORIGIN);
  });
});

authRouter.get("/session", async (req, res, next) => {
  const roles = [];
  if (req.session.userId) {
    roles.push("user");
    let isAuthor, isAdmin;
    try {
      [isAuthor, isAdmin] = await Promise.all([
        isTeamMember(
          req.session.accessToken,
          req.session.githubUsername,
          process.env.GITHUB_AUTHZ_ORG,
          process.env.GITHUB_AUTHORS_TEAM
        ),
        isTeamMember(
          req.session.accessToken,
          req.session.githubUsername,
          process.env.GITHUB_AUTHZ_ORG,
          process.env.GITHUB_ADMINS_TEAM
        ),
      ]);
    } catch (e) {
      next(e);
      return;
    }
    if (isAuthor) {
      roles.push("author");
    }
    if (isAdmin) {
      roles.push("admin");
    }
  } else {
    roles.push("anonymous");
  }
  res.json(
    itemEnvelope({
      user_id: req.session.userId || null,
      github_username: req.session.githubUsername || null,
      roles,
    })
  );
});

module.exports = authRouter;
