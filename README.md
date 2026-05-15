# Minimalistic diary

> [!TIP]
> Try on [Github Sites](https://dcniemandd.github.io/mini-diary/)!!!

The goal of this project is to make a basic React app, that is not to-do list. I know, this is a has-done list, but shh. I want to expand on the idea with some extra features:

- [**persistence**](#persistence) - user data will be saved in browser storage
- [**security**](#security) - user data will be secured using password
- [**pwa enabled**](#pwa-enabled) - small addition, but useful for mobile phones
- [**minimize js**](#minimize-js) - use as many stock html and css features to minimize JS

## Summary

There was a lot of extra work done to make this application viable. I tried to smooth all the edges and add all the missing features:

- importing and exporting of notes and profiles
- password change
- idle logout
- patch notes
- multi-user support

Non-visible changes to the architecture were necessary to support the extra stuff:

- indexed database
- TanStack Query - wanted to learn it

There were a lot of wrong decisions, still are. I hope that most of them are from adding new stuff. I did some refactoring to split one big context into smaller parts. More structural stuff could be done, but that'll wait for the next burst of energy and free time.

There are only a few dependencies used. Some are required, some are to make it easier:

- react - required
- react-dom - required
- sass - theoretically not required anymore, but helps to clear output thanks to compilation
- zod - schema validation, will never make it myself
- luxon - required until the new `Temporal` api has more support
- idb - wrapper for the indexed database, makes handling it easier
- tanstack/react-query - I wanted to learn it, will use it in the future again

## AI usage

This project was for me to learn. I used AI to:

- suggest different solutions for my problems, that I didn't know
- help me find bugs that I couldn't find myself
- tell me how the stuff is done
- commit the code a couple times - I wasn't really happy with commit messages it generated even with guidelines
- fine-tune my plans to implement bigger features
- refactor the code when implementing new stuff
- copy&paste different variants of similar code such as positions for popover

I always checked the output it generated and tried to learn from it. I even had to edit the output multiple times for it to follow my guidelines. I will never be able to vibe code just out of principle, but I understand that it can produce "working" outputs. In the end I learned a lot about using AI, and that was my goal.

## Planning phase

### Persistence

Data will be stored in browser storage. There are several ways to considered.

#### Local storage warrior

All data can be saved in this string-string map. It sure is easier to implement, but it really isn't pretty. User data can be stored as a big stringified object or as separate records under a common key prefix.

#### Indexed database mage

Perfect for storing user data. Easier to implement tables for storing multiple user auth data. But that is too much work.

#### Jack-of-all-trades bard

Thanks to aiming for one user only, we can store auth data in the local storage and user data in the database. To ensure not losing everything when someone accidentally removes local storage (_cough_), we can tell the user to store database key elsewhere and ask for it, when we loose it.

#### Final solution

First versions will use local storage to simplify the design. Eventually there will be migration to the indexed database. The main reason is infinite scroll. Other reasons are the local storage capacity limit, date encryption, and finally multiple users support.

### Security

The flow will be the same as for one user and multiple users support. The only addition will be using username to fetch stored keys from the database.

#### Password and Data

User will have to enter password when they open session. The password itself won't be stored. It will be encoded using [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) and the output will be used as a key to encrypt randomly generated database key using [AES-GCM](https://www.cryptopp.com/wiki/GCM_Mode).

Each diary note will be hashed with the database key. Using database key generated when the page is first opened will ensure that the user will be able to change password. For a new password all we have to do is decode the old password with the old password key and encode with the new one.

#### Diagram of crypto data flow

```
    ┌──────────────────┐
    │ User's password  │
    └─────────┬────────┘
              ▼ PBKDF2
    ┌──────────────────┐     ┌───────────────────┐
┌───┤Encrypted password│◄────┤   Salt (STORED)   │
│   └─────────┬────────┘     └───────────────────┘
│             ▼ AES-GCM
│   ┌──────────────────┐     ┌───────────────────┐
│   │ Encrypted DB key │◄────┤   Random DB key   │
│   │      (STORED)    │     │(generated at regi)│
│   └──────────────────┘     └──────────┬────────┘
│                                       │
│   ┌──────────────────┐                │
└──►│     HMAC         │◄───────────────┤
    │(crypto check-sum)│                │
    └──────────────────┘                │
                                        │
                                        │ AES-GCM
                                        ▼
    ┌──────────────────┐     ┌───────────────────┐
    │    Users data    ├────►│  User gibberish   │
    │                  │     │       (STORED)    │
    └──────────────────┘     └───────────────────┘
```

#### Login

1. user enters a password
1. password-key is generated from stored salt
1. database-key is decrypted using password-key
1. database-key is verified using stored HMAC
1. login is successful and we can start using database

#### Password change

Password is used only to encrypt the database key. For the change we only need to encrypt the key with the new password. The same key is still used to access the user's data.

#### Thoughts

In the end we will store three items for authentication purposes.

-   salt - zero information
-   HMAC - not really possible to get any information due to double layer hashing
-   encrypted DB key - same as HMAC

### PWA enabled

For users to install this web app onto their phone or desktop for offline use.

This is done thanks to Vite PWA package.

### Minimize JS

Try to use modern browser features such as:

-   [popover](https://www.w3schools.com/tags/att_popover.asp)
-   [light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
-   [relative color syntax](https://codepen.io/fbernack/pen/jEbegJg)
-   [content-visibility](https://content-visibility-demo-igp4j.sevalla.page/)
-   [css property](https://css-tricks.com/almanac/rules/p/property/)

### Sources

-   [PBKDF2 implementation](https://mojoauth.com/hashing/pbkdf2-in-javascript-in-browser/)
-   [Double key shenanigans](https://stackoverflow.com/questions/27608474/do-modern-browsers-encrypt-or-otherwise-protect-indexeddb-storage#comment131712139_27608507)
-   [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)
-   [ASCII graph](https://asciiflow.com/#/)
-   [PWA Vite install](https://www.saurabhmisra.dev/setup-react-pwa-using-vite/)
-   [modern features video](https://www.youtube.com/watch?v=55uUK-iJeNM)
-   [pick ui colors video](https://www.youtube.com/watch?v=vvPklRN0Tco)
-   [pick ui colors logic](https://codepen.io/whosajid/pen/QwbZOzG)


## [Patch notes](./src/hooks/usePatchNotes.tsx)

Left for the memories.

- ~~note component~~
    - ~~replace textarea with p for past entries~~
    - ~~add indication of a series of days in a row~~
- ~~login layout~~
    - ~~add about/help button with dialog~~
    - ~~focus password field on load~~ (bad practice - accessibility)
- notes layout
    - ~~settings/bottom/logout styling~~
    - ~~automatic loading when scrolling to the top~~
    - ~~change DB - autoincrement id for user - no need to remap entries~~
    - ~~expand settings with password change~~, ~~about/help~~
    - ~~focus note field on load~~ (bad practice - accessibility)
    - ~~data export/import~~
    - ~~logout timeout, enable user to select time~~
- ~~saving notes to indexedDB~~
    - ~~needs to refactor dataflow - extract todays note into own query/mutation~~
    - ~~rename databaseKey to a userId~~
    - ~~multiple users support~~

-redo
    - ~~switch dialog close button to have no background and fixed size~~
    - ~~button colours on hover etc~~
    - ~~dialog has scrollable content, not the whole dialog~~
    - ~~settings poporver responsivity~~

-bug
    - ~~responsivity - change password labels and inputs separate rows~~
    - ~~cannot type in the middle of the note - cursor moves to the end~~
    - ~~first createEntry breakes in transaction~~
    - ~~test behaviour after midnight - double saving~~
    - ~~upload button disabled after os dialog canceled~~ - cannot replicate
    - ~~settings doesn't scroll for low height screens~~
