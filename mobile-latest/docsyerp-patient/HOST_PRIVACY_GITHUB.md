Quick hosting instructions for `privacy_policy.html` using GitHub Pages

1) Create a new GitHub repository for hosting (or use an existing clinic website repository).
2) Copy `privacy_policy.html` to the repository root (or `docs/privacy_policy.html`).
3) If placed under `docs/`, go to repository Settings → Pages → Source and set to `gh-pages` branch or `main` branch `/docs` folder.
4) If placed at root, you can enable GitHub Pages from the repository Settings → Pages and select the `main` branch root.
5) Once published, your policy will be available at `https://<username>.github.io/<repo>/privacy_policy.html` or the URL shown in Pages settings.
6) Use that HTTPS URL in the Play Console's Privacy Policy field and Data Safety forms.

Example quick steps (local):

```bash
# in a local folder
git init
git add privacy_policy.html
git commit -m "Add privacy policy"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/clinic-privacy.git
git push -u origin main
```

Then enable GitHub Pages and copy the published URL into Play Console.
