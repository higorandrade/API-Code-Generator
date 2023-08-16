const fs = require('fs');
const pathModule = require('path');
const execSync = require('child_process').execSync;
const mockup_assistent = require('./mockup_assistent');

// TODO: Read framework version from cmd
const framework = {
    name: 'net',
    version: '7.0'
}

var paths, projectName, connection;
var domainPath, infraPath, apiPath;
var domainFile, infraFile, apiFile;

function isGreaterVersion(version, referenceVersion) {
    versionTokens = version.split('.');
    referenceTokens = referenceVersion.split('.');

    for (let i=0; i < versionTokens.length; i++) {
        if (versionTokens[i] < referenceTokens[i])
            return false;
    }

    return true;
}

function getDate() {
    const d = new Date();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return year + month + day + hours + minutes + seconds;
}

function createProject(_paths, _projectName, _connection) {
    paths = _paths;
    projectName = _projectName;
    connection = _connection;

    domainPath = paths.domainPath;
    infraPath = paths.infraPath;
    apiPath = paths.apiPath;

    domainFile = getCsproj(domainPath);
    infraFile = getCsproj(infraPath);
    apiFile = getCsproj(apiPath);
    
    if(!domainFile)
        domainFile = initializeDomain();

    if(!infraFile)
        infraFile = initializeInfra();

    if (!apiFile)
        initializeApi();

    if (connection.host &&
        connection.database &&
        connection.username &&
        connection.password) {
            const content = fs.readFileSync(`${paths.apiPath}\\appsettings.json`).toString();
            const connectionString = defaultConnection(connection);
            const newContent = content.substring(0, 1) + connectionString + content.substring(1, content.length + connectionString.length);
            fs.writeFileSync(`${paths.apiPath}\\appsettings.json`, newContent);
        }
}

function createCsproj(path) {
    fs.mkdirSync(path, { recursive: true });
    const fileFullPath = `${path}\\${pathModule.basename(path)}.csproj`;
    fs.writeFileSync(fileFullPath, csprojContent(framework));
    return fileFullPath;
}

function getCsproj(path) {
    try {
        const files = fs.readdirSync(path);
        for (const file of files) {
            if (file.endsWith('.csproj'))
                return pathModule.join(path, file);
        }
    } catch (error) {
        return;
    }

    return;
}

function initializeDomain() {
    const domainCsprojFile = createCsproj(paths.domainPath);
    return domainCsprojFile;
}

function initializeInfra() {
    const infraCsprojFile = createCsproj(infraPath);
    addEntityFramework(infraPath);
    addNpgsql(infraPath);
    addPackage(infraPath, "AutoMapper.Collection");
    addReference(infraPath, domainFile);
    mockup_assistent.writeNewContext(paths, projectName);
    return infraCsprojFile;
}

function initializeApi() {
    fs.mkdirSync(apiPath, { recursive: true });
    execSync('dotnet new webapi', { cwd: apiPath, encoding: 'utf-8' });
    removeWeatherForecast(apiPath);
    addEntityFramework(apiPath);
    addNpgsql(apiPath);
    addReference(apiPath, domainFile);
    addReference(apiPath, infraFile);
    addAutoFac();
}

function removeWeatherForecast(path) {
    fs.unlinkSync(`${path}\\WeatherForecast.cs`);
    fs.rmSync(`${path}\\Controllers`, { recursive: true });
}

function addAutoFac() {
    addPackage(apiPath, 'Autofac');
    addPackage(apiPath, 'Autofac.Extensions.DependencyInjection');

    const modulesPath = `${apiPath}\\Modules`;
    fs.mkdirSync(modulesPath, { recursive: true });

    fs.writeFileSync(`${modulesPath}\\AutofacModule.cs`, autofacModuleContent(projectName));
    fs.writeFileSync(`${apiPath}\\Program.cs`, programContent(projectName, apiPath));
    if (!isGreaterVersion(framework.version, '6.0')) {
        // TODO: edit startup.cs
    }
}

function addNpgsql(path) {
    addPackage(path, "Npgsql");
    addPackage(path, "Npgsql.EntityFrameworkCore.PostgreSQL");
}

function addEntityFramework(path) {
    addPackage(path, 'Microsoft.EntityFrameworkCore');
    addPackage(path, 'Microsoft.EntityFrameworkCore.Design');
}

function addPackage(path, package) {
    execSync(`dotnet add package ${package}`, { cwd: path, encoding: 'utf-8' });
}

function addReference(path, reference) {
    const relativePath = pathModule.relative(path, reference);
    execSync(`dotnet add reference ${relativePath}`, { cwd: path, encoding: 'utf-8' });
}

function execMigration(serviceName, infraPath, apiPath) {
    execSync(`dotnet ef migrations add ${serviceName}Migration${getDate()} --project ${infraPath}`, { cwd: apiPath, encoding: 'utf-8' });
    execSync(`dotnet ef database update --project ${infraPath}`, { cwd: apiPath, encoding: 'utf-8' });
}

function defaultConnection(connection) {
    return `
  "ConnectionStrings": {
    "DefaultConnection": "Host=${connection.host};Database=${connection.database};Username=${connection.username};Password=${connection.password}"
  },`
}

function programContent(projectName, apiPath) {
    if (isGreaterVersion(framework.version, '6.0')) {
        let content = `using Autofac;
using Autofac.Extensions.DependencyInjection;
using ${projectName}.API.Modules;
using ${projectName}.Infra;
using Microsoft.EntityFrameworkCore;
`;
        const contentFromFile = fs.readFileSync(`${apiPath}\\Program.cs`).toString();
        content += contentFromFile;
        builder = 'var builder = WebApplication.CreateBuilder(args);';
        builderIndex = content.indexOf(builder);
        endOfLine = content.indexOf(';', builderIndex);

        const autofacString = `

builder.Host.UseServiceProviderFactory(new AutofacServiceProviderFactory());
builder.Host.ConfigureContainer<ContainerBuilder>(builder => builder.RegisterModule(new AutofacModule()));

builder.Services.AddDbContext<HigorContext>(options => 
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));`;

        return content.substring(0, endOfLine + 1) + autofacString + content.substring(endOfLine + 1);
    }
}

function csprojContent(framework) {
    let content = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>${framework.name}${framework.version}</TargetFramework>`

    if (isGreaterVersion(framework.version, '6.0')) {
        content += `
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>`;
    }

    content += `
  </PropertyGroup>

</Project>`
    return content; 
}

function autofacModuleContent(projectName) {
    let content = `using Autofac;

namespace ${projectName}.API.Modules
{
    public class AutofacModule : Module
    {
        protected override void Load(ContainerBuilder builder)
        {
            builder.RegisterAssemblyTypes(typeof(`;
    
    if (isGreaterVersion(framework.version, '6.0'))
        content += 'Program';
    else 
        content += 'Startup';
    
    content += `).Assembly)
                .AsSelf()
                .AsImplementedInterfaces()
                .InstancePerLifetimeScope();
                
            builder.RegisterAssemblyTypes(typeof(Infra.${projectName}Context).Assembly)
                .AsImplementedInterfaces()
                .InstancePerLifetimeScope();
        }
    }
}`

    return content;
}

module.exports = {
    createProject,
    execMigration
};