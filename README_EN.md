# Anixweb

> This is an unofficial client and is not affiliated with the Anixart developers. Some features may be unavailable, and future maintenance or development is not guaranteed.

Anixweb is an open-source, unofficial web client for the Anixart mobile app.

> The project is still at an early stage of development, so many features are currently unavailable.

## Available features

- [ ] Account
  - [x] Sign in, account registration, and password recovery
  - [x] View your own or another user's account
  - [ ] Edit account details
- [x] Home page
  - [x] “My tab”
  - [x] “Latest”
  - [x] “Ongoing”
  - [x] “Announcements”
  - [x] “Completed”
  - [x] “Movies”
- [x] Search
- [ ] Browse anime using filters[^filters]
- [x] Theme switching (the app is optimized for the light theme; full dark-theme compatibility is not guaranteed)
- [x] Release page
  - [x] Add releases to lists/favorites
  - [x] Watch episodes
  - [x] Screenshots
  - [x] Comments
    - [x] Like/dislike a comment[^unstable]
    - [x] Reply to a comment[^unstable]
    - [x] Post a comment[^unstable]
    - [ ] All comments
    - [x] View replies
- [x] Built-in player
  - [x] Save watch progress
  - [x] Change quality
  - [x] Quality enhancement with [Anime4K](https://github.com/bloc97/anime4k)
  - [x] Change playback speed
  - [x] Change aspect ratio
- [x] View history, favorites, and lists
- [x] Random anime

[^unstable]: Continued availability of these features is not guaranteed.
[^filters]: Currently works only through the “My tab” section.

## Local build

```bash
git clone https://github.com/imnottimaq/anixart-web.git
cd anixart-web
npm install
# Build the site
npm run build
# Start a local development server
npm run dev
```

## Feedback

Found a bug or have an idea for an improvement? Open an [issue](https://github.com/imnottimaq/anixart-web/issues "issue") or create a pull request.
