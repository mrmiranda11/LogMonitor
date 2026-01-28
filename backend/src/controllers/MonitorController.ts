
import { Request, Response } from "express";

import * as path from "path";
import dotenv from 'dotenv';
import * as fs from "fs"; // para streams
import * as fsp from "fs/promises";
import * as readline from "readline";


dotenv.config();

async function leerDirectorios(directorio: string): Promise<string[]> {
    let listaArchivos: string[] = [];
    const elementos = await fsp.readdir(directorio);

    for (const elemento of elementos) {
        const rutaCompleta = path.join(directorio, elemento);
        const stats = await fsp.stat(rutaCompleta);

        if (stats.isDirectory()) {
            const subArchivos = await leerDirectorios(rutaCompleta);
            listaArchivos = listaArchivos.concat(subArchivos);
        } else {
            listaArchivos.push(rutaCompleta);
        }
    }
    return listaArchivos;
}

export class MonitorController {

    readLog = async (req: Request, res: Response) => {
        const inicio = process.hrtime();
        const { inputBusqueda,inputBuffer, selecTemplate, selecTemplateText, opcionesConsulta, radioAmbiente } = req.body;
        console.log(inputBusqueda, inputBuffer, selecTemplate, opcionesConsulta, radioAmbiente);
        const bufferFile = (selecTemplate === '1' || selecTemplate === '5') ? '1' : inputBuffer;
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const dirServer = "" + process.env['dir.path.server'] + radioAmbiente;
        const archivos = await leerDirectorios(dirServer);
        const regexTemplate2 = new RegExp(`${selecTemplateText}.*<IdConsultado>(${opcionesConsulta})</IdConsultado>`);
        const regexTemplate3 = new RegExp(`${selecTemplateText}.*<template2`);
        let buffer: string[] = [];
        for (const element of archivos) {
            const fileName = element.split("\\LogsDecisor\\")[1]; 
            res.write(`data: ${JSON.stringify({ type: 'server', message: fileName })}\n\n`);
            const fileStream = fs.createReadStream(element, {
                encoding: "utf8",
                highWaterMark: 1024 * 1024 // buffer de 1 MB para menos llamadas al sistema
            });
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
            fileStream.on('error', err => {
                res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
            });
            let isMatch = false;
            for await (const linea of rl) {
                
                switch (selecTemplate) {
                    case "1":
                        if(linea.includes(opcionesConsulta)){
                            //res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                            isMatch = true;
                            buffer.push(`data: ${JSON.stringify({ type: "progress", message: linea })}\n\n`);
                        }else{
                            if(isMatch){
                                buffer.push(`data: ${JSON.stringify({ type: "progress", message: linea })}\n\n`);
                            }
                        }
                        break;
                    case "2":
                        if (regexTemplate2.test(linea)) {
                            isMatch = true;
                            //res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                            buffer.push(`data: ${JSON.stringify({ type: "progress", message: linea })}\n\n`);
                        }
                        break;
                    case "2":
                        if (regexTemplate3.test(linea)) {
                            isMatch = true;
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                        break;
                    default:
                        break;
                }
              
                if (isMatch && buffer.length > bufferFile) { 
                    res.write(buffer.join("")); // enviar bloque acumulado buffer = []; // limpiar 
                    buffer = [];
                    isMatch=false;
                }
            }
            if (buffer.length > 0) { 
                res.write(buffer.join("")); // enviar bloque acumulado buffer = []; // limpiar 
            }
            
        };

        

        const fin = process.hrtime(inicio);
        const segundos = fin[0] + fin[1] / 1e9;

        if (segundos > 60) {
            const minutos = (segundos / 60).toFixed(2);
            res.write(`data: ${JSON.stringify({ type: 'progress', message: `Tiempo total de ejecucion: ${minutos} minutos` })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: 'progress', message: `Tiempo total de ejecucion: ${segundos.toFixed(2)} segundos` })}\n\n`);
        }
        return res.end();
    }

}