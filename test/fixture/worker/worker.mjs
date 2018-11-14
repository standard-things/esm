import { parentPort } from "worker_threads"

parentPort.postMessage("worker:true")
