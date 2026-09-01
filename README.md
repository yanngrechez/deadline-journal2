# Deadline Journal — free CMS edition

This project preserves the Deadline Journal editorial template and adds a free publishing workflow using:

- GitHub — source/content repository
- Pages CMS — visual article editor
- Cloudflare Pages — public hosting and automatic deployment

## Cloudflare build settings
- Framework preset: None
- Production branch: main
- Build command: npm run build
- Build output directory: dist

## Publishing
Open https://app.pagescms.org, sign in with GitHub, select this repository, open Articles, edit/create a story, set Status to Published, and Save.

Every save commits the content to GitHub. Cloudflare then rebuilds the site automatically.

## Drafts
Articles with Status = Draft are omitted from the public `data.js` by `build.js`, so they do not appear on the public site.

## Homepage positioning
Homepage Rank:
1 = lead story
2 = lower-left supporting story
3–4 = middle column
5–8 = right headline rail
999 = normal/default

Latest and regional sections are determined automatically from publication date and region.
