import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { basename, join, relative } from 'path';
import { execSync } from 'child_process';
import { writeNewContext } from "./mockup_assistent.js";

// TODO: Read framework version from cmd
const framework = {
    name: 'net',
    version: '8.0'
}

var paths, projectName, connection;
var domainPath, infraPath, apiPath;
var domainFile, infraFile, apiFile;

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

export function createProject(_paths, _projectName, _connection) {
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
            const content = readFileSync(`${paths.apiPath}\\appsettings.json`).toString();
            const connectionString = defaultConnection(connection);
            const newContent = content.substring(0, 1) + connectionString + content.substring(1, content.length + connectionString.length);
            writeFileSync(`${paths.apiPath}\\appsettings.json`, newContent);
        }
}

function createCsproj(path) {
    mkdirSync(path, { recursive: true });
    const fileFullPath = `${path}\\${basename(path)}.csproj`;
    writeFileSync(fileFullPath, csprojContent(framework));
    return fileFullPath;
}

function getCsproj(path) {
    try {
        const files = readdirSync(path);
        for (const file of files) {
            if (file.endsWith('.csproj'))
                return join(path, file);
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
    writeNewContext(paths, projectName);
    return infraCsprojFile;
}

function initializeApi() {
    mkdirSync(apiPath, { recursive: true });
    execSync('dotnet new webapi', { cwd: apiPath, encoding: 'utf-8' });
    addEntityFramework(apiPath);
    addNpgsql(apiPath);
    addReference(apiPath, domainFile);
    addReference(apiPath, infraFile);
    addAutoFac();
}

function addAutoFac() {
    addPackage(apiPath, 'Autofac');
    addPackage(apiPath, 'Autofac.Extensions.DependencyInjection');

    const modulesPath = `${apiPath}\\Modules`;
    mkdirSync(modulesPath, { recursive: true });

    writeFileSync(`${modulesPath}\\AutofacModule.cs`, autofacModuleContent(projectName));
    writeFileSync(`${apiPath}\\Program.cs`, programContent(projectName));
}

function addNpgsql(path) {
    addPackage(path, "Npgsql");
    addPackage(path, "Npgsql.EntityFrameworkCore.PostgreSQL");
}

function addEntityFramework(path) {
    addPackage(path, 'Microsoft.EntityFrameworkCore');
    addPackage(path, 'Microsoft.EntityFrameworkCore.Design');
}

function addPackage(path, packageName) {
    execSync(`dotnet add package ${packageName}`, {
      cwd: path,
      encoding: "utf-8",
    });
}

function addReference(path, reference) {
    const relativePath = relative(path, reference);
    execSync(`dotnet add reference ${relativePath}`, { cwd: path, encoding: 'utf-8' });
}

export function execMigration(serviceName, infraPath, apiPath) {
    execSync(`dotnet ef migrations add ${serviceName}Migration${getDate()} --project ${infraPath}`, { cwd: apiPath, encoding: 'utf-8' });
    execSync(`dotnet ef database update --project ${infraPath}`, { cwd: apiPath, encoding: 'utf-8' });
}

function defaultConnection(connection) {
    return `
  "ConnectionStrings": {
    "DefaultConnection": "Host=${connection.host};Database=${connection.database};Username=${connection.username};Password=${connection.password}"
  },`
}

function programContent(projectName) {
    let content = `using Autofac;
using Autofac.Extensions.DependencyInjection;
using ${projectName}.API.Modules;
using ${projectName}.Infra;
using Microsoft.EntityFrameworkCore;
var builder = WebApplication.CreateBuilder(args);

builder.Host.UseServiceProviderFactory(new AutofacServiceProviderFactory());
builder.Host.ConfigureContainer<ContainerBuilder>(builder => builder.RegisterModule(new AutofacModule()));

builder.Services.AddDbContext<${projectName}Context>(options => 
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();`;

    return content;
}

function csprojContent(framework) {
    let content = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>${framework.name}${framework.version}</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
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
            builder.RegisterAssemblyTypes(typeof(Program).Assembly)
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
