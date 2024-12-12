import { readFileSync, mkdirSync } from "fs";
import { createProject as _createProject, execMigration } from './dotnet_assistent.js';
import { createService as _createService } from './mockup_assistent.js';

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

    mkdirSync(controllerPath, { recursive: true });
    mkdirSync(`${businessPath}\\Interfaces`, { recursive: true });
    mkdirSync(entityPath, { recursive: true });
    mkdirSync(`${repositoryPath}\\Interfaces`, { recursive: true });
    mkdirSync(mapperPath, { recursive: true });
    mkdirSync(modelPath, { recursive: true });

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
        return `I/O Error in the creation of the directory for project "${projectName}".`;
    }

    try {
        _createProject(paths, projectName, connection);
    } catch (error) {
        console.error(error);
        return `Error to create project "${projectName}".`
    }
    
    const msg = `"${projectName}" project successfully created.`;
    console.log(msg)
    return msg;
}

function createService(projectName, projectPath, serviceName, properties, relations, run_migration=false) {
    try {
        var paths = createDirectories(projectName, projectPath);
    } catch (error) {
        console.error(error);
        return `I/O Error in the creation of the service "${serviceName}".`;
    }
    
    try {
        _createService(paths, projectName, serviceName, properties, relations);
    } catch (error) {
        console.error(error);
        return `I/O Error in the creation of files for the service "${serviceName}".`;
    }

    if (run_migration) {
        try {
            execMigration(serviceName, paths.infraPath, paths.apiPath);
        } catch (error) {
            console.error(error);
            return `Fail to run migration. Check files and run migration manually.`;
        }
    }

    const msg = `"${serviceName}" service successfully created.`;
    console.log(msg);
    return msg;
}

const getArgs = () =>
  process.argv.reduce((args, arg) => {
    // long arg
    if (arg.slice(0, 2) === "--") {
      const longArg = arg.split("=");
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : true;
      args[longArgFlag] = longArgValue;
    }
    // flags
    else if (arg[0] === "-") {
      const flags = arg.slice(1).split("");
      flags.forEach((flag) => {
        args[flag] = true;
      });
    }
    return args;
  }, {});

function run() {
  try {
    const args = getArgs();
    const file_path = args["file"];

    if (!file_path) {
      file_path = args["f"];
    }

    const file = readFileSync("C:\\Users\\higor\\Projetos\\API-Code-Generator\\demo.json");
    const file_obj = JSON.parse(file);

    if (args["c"]) {
      // create project
      createProject(
        file_obj.projectName,
        file_obj.projectPath,
        file_obj.connection
      );
    }

    for (const service of file_obj.services) {
      createService(
        file_obj.projectName,
        file_obj.projectPath,
        service.name,
        service.properties,
        service.relations
      );
      console.log();
    }
  } catch (err) {
    console.error(err);
    console.error("Please provide the path to a valid json file via '--file' flag");
  }
}

run()
