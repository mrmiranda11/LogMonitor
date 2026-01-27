
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
        const { inputBusqueda, selecTemplate, selecTemplateText, opcionesConsulta, radioAmbiente } = req.body;
        console.log(inputBusqueda, selecTemplate, opcionesConsulta, radioAmbiente);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const dirServer = "" + process.env['dir.path.server'] + radioAmbiente;
        const archivos = await leerDirectorios(dirServer);

        
        const regexTemplate2 = new RegExp(`${selecTemplateText}.*<IdConsultado>(${opcionesConsulta})</IdConsultado>`);
        const regexTemplate3 = new RegExp(`${selecTemplateText}.*<template2`);

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

            let buffer: String[] = [];
            for await (const linea of rl) {
                switch (selecTemplate) {
                    case "1":
                        if(opcionesConsulta.includes("1231321")){
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                        break;
                    case "2":
                        if (regexTemplate2.test(linea)) {
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                        break;
                    case "2":
                        if (regexTemplate3.test(linea)) {
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                        break;
                    default:
                        break;
                }
                /*if (selecTemplate === '2') {
                    if (regexTemplate2.test(linea)) {
                        res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                    }
                } else if (selecTemplate === '3') {
                    if (regexTemplate3.test(linea)) {
                        res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                    }
                }*/
                if (buffer.length > 100) { 
                    res.write(buffer.join("")); // enviar bloque acumulado buffer = []; // limpiar 
                }

                
            }
            if (buffer.length > 0) { 
                res.write(buffer.join("")); // enviar bloque acumulado buffer = []; // limpiar 
            }
            
        };

        /*for (const element of archivos) {
            res.write(`data: ${JSON.stringify({ type: 'server', message: element })}\n\n`);

            const fileStream = fs.createReadStream(element, { encoding: "utf8" });
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            fileStream.on('error', err => {
                res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
            });
            
            for await (const linea of rl) {
                for (const idConsultado of opcionesConsulta) {
                    if (selecTemplate === '1') {
                        if (linea.includes(selecTemplateText) &&
                            linea.includes(`<IdConsultado>${idConsultado}</IdConsultado>`)) {
                                res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                    }

                    if (selecTemplate === '2') {
                        if (linea.includes(selecTemplateText) &&
                            linea.includes('[executeEngine] Respuesta:') &&
                            linea.includes('error="true"')) {
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: linea })}\n\n`);
                        }
                    }
                }
            }
        }*/

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