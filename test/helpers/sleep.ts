const sleep = (time: number = 100) => new Promise((resolve) => setTimeout(resolve, time));

export default sleep;
