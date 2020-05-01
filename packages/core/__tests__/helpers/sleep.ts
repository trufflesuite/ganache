const sleep = (time: number = 500) => new Promise(resolve => setTimeout(resolve, time));

export default sleep;
