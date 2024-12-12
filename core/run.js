import { mkdirSync } from 'fs';
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

const mock_project = {
    projectName: "TesteProject",
    projectPath: "C:\\Users\\higor\\Projetos\\test-generic-csharp-api",
    connection: {
        host: "localhost",
        database: "api-generator-test",
        username: "postgres",
        password: "postgres",
    },
};
 
// createProject(
//     mock_project.projectName,
//     mock_project.projectPath,
//     mock_project.connection
// );

const person_mock_properties = [
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

const person_mock_relations = [
  {
    name: "Communities",
    type: "Community",
    foreignName: "Members",
    table: null,
    size: "N:M",
  },
];

createService(
  mock_project.projectName,
  mock_project.projectPath,
  "Person",
  person_mock_properties,
  person_mock_relations
);

const address_mock_properties = [
  {
    name: "Street",
    type: "string",
    required: true,
  },
  {
    name: "Number",
    type: "int",
    required: false,
  },
  {
    name: "City",
    type: "string",
    required: false,
  },
];

const address_mock_relations = [
    {
        name: "Resident",
        type: "Person",
        foreignName: "Address",
        table: null,
        size: "N:1"
    }
];

createService(
  mock_project.projectName,
  mock_project.projectPath,
  "Address",
  address_mock_properties,
  address_mock_relations
);

const community_mock_properties = [
  {
    name: "Name",
    type: "string",
    required: true,
  }
];

const community_mock_relations = [
  {
    name: "Members",
    type: "Person",
    foreignName: "Communities",
    table: null,
    size: "N:M",
  },
];

createService(
  mock_project.projectName,
  mock_project.projectPath,
  "Community",
  community_mock_properties,
  community_mock_relations,
  true
);

export default { createService, createProject };