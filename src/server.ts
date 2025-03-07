import app from "./app";

const start = async () => {
    try {
        await app.listen({ port: 4000, host: "0.0.0.0" });
        console.log("IAM Backend running on http://localhost:3000");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
