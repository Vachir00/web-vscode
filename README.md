# Welcome !
This is a personal project to manage my developments. I'm updating it perodically based on my necessity, feel free to make any change you need for your projects.
## Functions

- Web editor: I'm using monaco, it is not like vscode, it is more like a notepad with esteroids, I used it when I need an editor, and I'm not allowed to use VSCode, weird case, but it occurs.
- cURL: Weirdly I found that I needed this tool for some specific cases... It works 98% but I have to add the history!! maybe in the next version.
- Database: It is intended to connect to a database and export a diagram that you could get as SVG to use it privately. **I did not test it on MySQL (yet)**
- Second Brain: The idea is simply. You can create notes using enriched text, very simple and fast. I'm using SQLite to organize the files and it works pretty well.

## Issues
- Since I'm using SQLite, if you delete the container or migrate it you will lose all the notes.

## Future plans
- Add cURL history
- DATABASES... yes we have a feature to see the database structure and export it as SVG. but (and also it feels unpersonal) I think we need something like an editor, maybe a way to execute SQL queries directly in the database.
- For the Code Editor and the Second Brain... we need to export the files maybe as a tar or something like that. The idea is simple, I'll create a "configs" tab to manage that feature so it won't produce noise on the existing features. In the configs tabs you'll be able to export the files and also (obviously) import them.

## How to use it
Easy, pretty easy, you could use my docker image (published on Docker Hub) vachir00/web-vscode:0.5 . Feel free to use it anywhere you need. If you want to use the source code, you will have to download it, install dependecies, install postgresql client, and try.

**Please remember it is from a developer for developers, and it was made using Gemini and GPT, so use them to install it!**

**The docker image works only for PostgreSQL17**

if you run

    docker run --network bridge -p 3000:3000 vachir00/web-vscode:0.5

it will work.

**if you want to have a docker-compose file, or a specific configuration, it is all for you! so do it!**

## Contact me
Well, if you wanna talk about weird things like software, linux, or this specific development, use LinkedIn you'll find the profile in the bio. I won't respond quickly and as well I don't know how to use it, so be patient and kind.
Adios!