const fs = require('fs');
const dotnetAssistent = require('./dotnet_assistent');
const mockup_assistent = require('./mockup_assistent');

function handlePath(path) {
    return path.replaceAll('\\', '\\\\');
}

function createDirectories(projectName, projectPath) {
    projectPath = handlePath(projectPath);

    const apiPath = `${projectPath}\\${projectName}.API`;
    const businessPath = `${apiPath}\\Business`;
    const controllerPath = `${apiPath}\\Controllers`;
    const domainPath = `${projectPath}\\${projectName}.Domain`;
    const modelPath = `${domainPath}\\Model`;
    const infraPath = `${projectPath}\\${projectName}.Infra`;
    const repositoryPath = `${infraPath}\\Repository`;
    const entityPath = `${infraPath}\\Entities`;
    const mapperPath = `${infraPath}\\Mapper`;

    fs.mkdirSync(controllerPath, { recursive: true });
    fs.mkdirSync(`${businessPath}\\Interfaces`, { recursive: true });
    fs.mkdirSync(entityPath, { recursive: true });
    fs.mkdirSync(`${repositoryPath}\\Interfaces`, { recursive: true });
    fs.mkdirSync(mapperPath, { recursive: true });
    fs.mkdirSync(modelPath, { recursive: true });

    return {
        apiPath,
        businessPath,
        controllerPath,
        domainPath,
        modelPath,
        infraPath,
        repositoryPath,
        entityPath,
        mapperPath
    };
}

function createProject(projectName, projectPath, connection) {
    try {
        var paths = createDirectories(projectName, projectPath);
    } catch (error) {
        console.error(error);
        return `Erro de I/O na criação de diretórios para o projeto ${projectName}.`;
    }

    try {
        dotnetAssistent.createProject(paths, projectName, connection);
    } catch (error) {
        console.error(error);
        return `Erro ao criar Projeto ${projectName}.`
    }

    return `Projeto ${projectName} criado com sucesso!`;
}

function createService(projectName, projectPath, serviceName, properties, relations, run_migration=false) {
    try {
        var paths = createDirectories(projectName, projectPath);
    } catch (error) {
        console.error(error);
        return `Erro de I/O na criação de diretórios para o serviço ${serviceName}.`;
    }
    
    try {
        mockup_assistent.createService(paths, projectName, serviceName, properties, relations);
    } catch (error) {
        console.error(error);
        return `Erro de I/O na criação de arquivos para o serviço ${serviceName}.`;
    }

    if (run_migration) {
        try {
            dotnetAssistent.execMigration(serviceName, paths.infraPath, paths.apiPath);
        } catch (error) {
            console.error(error);
            return `Falha ao executar migração. Verique os arquivos e execute manualmente.`;
        }
    }

    return `Serviço ${serviceName} criado com sucesso!`;
}


projectName = "Higor";
projectPath = "C:\\Users\\higor\\Projetos\\generic-csharp-api";
connection = {
  host: "localhost",
  database: "higor_test",
  username: "postgres",
  password: "postgres",
};
// createProject(projectName, projectPath, connection);

properties = [
  {
    name: "Name",
    type: "string",
    required: true,
  },
  {
    name: "Age",
    type: "int",
    required: true,
  },
];
createService(projectName, projectPath, 'Person', properties, []);

module.exports = { createService, createProject };