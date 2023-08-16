const fs = require('fs');

var projectName, serviceName;
var paths = {};
var properties = [];
var relations = [];

const mockupsPath = `${__dirname}\\mockups`;
const mockups = [
    {
        path: `{{businessPath}}\\Interfaces\\I{{serviceName}}Business.cs`,
        content: `${mockupsPath}\\IBusiness.txt`
    },
    {
        path: `{{businessPath}}\\{{serviceName}}Business.cs`,
        content: `${mockupsPath}\\Business.txt`
    },
    {
        path: `{{controllerPath}}/{{serviceName}}Controller.cs`,
        content: `${mockupsPath}\\Controller.txt`
    },
    {
        path: `{{repositoryPath}}\\Interfaces\\I{{serviceName}}Repository.cs`,
        content: `${mockupsPath}\\IRepository.txt`
    },
    {
        path: `{{repositoryPath}}\\{{serviceName}}Repository.cs`,
        content: `${mockupsPath}\\Repository.txt`
    },
    {
        path: `{{modelPath}}\\{{serviceName}}.cs`,
        content: `${mockupsPath}\\Model.txt`
    },
    {
        path: `{{entityPath}}\\{{serviceName}}Entity.cs`,
        content: `${mockupsPath}\\Entity.txt`
    }
];

const context = {
    path: `{{infraPath}}\\{{projectName}}Context.cs`,
    content: `${mockupsPath}\\Context.txt`,
    attribute: `${mockupsPath}\\ContextAttribute.txt`,
    relation: `${mockupsPath}\\ContextRelation.txt`
};

const mapper = {
    path: `{{mapperPath}}\\DefaultMapper.cs`,
    content: `${mockupsPath}\\Mapper.txt`,
}

function createService(_paths, _projectName, _serviceName, _properties, _relations) {
    paths = _paths;
    projectName = _projectName;
    serviceName = _serviceName;
    properties = _properties;
    relations = _relations;

    for (const mockup of mockups) {
        const path = replaceAllPaths(mockup.path);
        const content = replaceAllParams(fs.readFileSync(mockup.content).toString());
        fs.writeFileSync(path, replaceAllDeclarations(content));
    }

    writeContext();
    writeMapper();
}

function replaceAllPaths(str) {
    return str
            .replaceAll(`{{apiPath}}`, `${paths.apiPath}`)
            .replaceAll(`{{businessPath}}`, `${paths.businessPath}`)
            .replaceAll(`{{controllerPath}}`, `${paths.controllerPath}`)
            .replaceAll(`{{domainPath}}`, `${paths.domainPath}`)
            .replaceAll(`{{modelPath}}`, `${paths.modelPath}`)
            .replaceAll(`{{infraPath}}`, `${paths.infraPath}`)
            .replaceAll(`{{repositoryPath}}`, `${paths.repositoryPath}`)
            .replaceAll(`{{entityPath}}`, `${paths.entityPath}`)
            .replaceAll(`{{mapperPath}}`, `${paths.mapperPath}`)
            .replaceAll(`{{projectName}}`, `${projectName}`)
            .replaceAll(`{{serviceName}}`, `${serviceName}`)
}

function replaceAllParams(str) {
    return str
            .replaceAll(`{{projectName}}`, `${projectName}`)
            .replaceAll(`{{serviceName}}`, `${serviceName}`)
            .replaceAll(/\|\|(\w+?)\|\|/g, function toTable(match) {
                return snakeAndUpperCase(match.substring(2, match.length - 2));
            })
}

function replaceAllDeclarations(str) {
    return str            
            .replaceAll(`{{modelDeclarations}}`, `${getModelDeclarations()}`)
            .replaceAll(`{{entityDeclarations}}`, `${getEntityDeclarations()}`)
}

function replaceAllProperty(str, property) {
    let propertyReplaced = str
            .replaceAll(`{{propertyType}}`, `${property.type}`)
            .replaceAll(`{{propertyName}}`, `${property.name}`)
            .replaceAll(`{{modelPropertyRequired}}`, `${property.required ? '' : '?'}`)
            .replaceAll(`{{entityPropertyRequired}}`, `${property.required ? '\t\t[Required]\n' : ''}`)
    return replaceAllParams(propertyReplaced);
}

function replaceAllRelation(str, relation) {
    let relationReplaced = str
            .replaceAll(`{{relationType}}`, `${relation.type}`)
            .replaceAll(`{{relationName}}`, `${relation.name}`)
            .replaceAll(`{{relationForeignName}}`, `${relation.foreignName}`)
            .replaceAll(`{{relationRequired}}`, `${relation.size[0] > '0' ? '' : '?'}`)
            .replaceAll(`{{relationTable}}`, `${getRelationTableName(relation.name, relation.foreignName, relation.table)}`)
    return replaceAllParams(relationReplaced);
}

function readMockupFile(path) {
    return replaceAllParams(fs.readFileSync(path).toString());
}

function writeNewContext(_paths, _projectName) {
    paths = _paths;
    projectName = _projectName;

    const path = replaceAllPaths(context.path);
    let content = getContent(path, context.content);
    
    fs.writeFileSync(path, content);
}

function writeContext() {
    const path = replaceAllPaths(context.path);
    let content = getContent(path, context.content);
    
    content = addBeforeIfNotPresent(content, `using ${projectName}.Infra.Entities;\n\n`, `namespace`);

    const contextAttribute = replaceAllParams(readMockupFile(context.attribute));
    content = addAfterIfNotPresent(content, contextAttribute, `${projectName}Context()`, '}');

    const contextRelation = readMockupFile(context.relation);
    let contextModels = '';

    for (const relation of relations) {
        if (relation.size.includes('M') && !relationIsModeled(relation, content))
            contextModels += replaceAllRelation(contextRelation, relation);
    }

    content = addAfterIfNotPresent(content, contextModels, `OnModelCreating`, '{');

    fs.writeFileSync(path, content);
}

function writeMapper() {
    const path = replaceAllPaths(mapper.path);
    let content = getContent(path, mapper.content);

    (!isPresent(content, getMapper()))
        content = addAfterIfNotPresent(content, getMapperDeclaration(), `DefaultMapper()`, '{');

    fs.writeFileSync(path, content);
}

function getContent(targetPath, mockupPath) {
    try {
        return readMockupFile(targetPath);
    } catch (error) {
        return readMockupFile(mockupPath);
    }
}

function getModelDeclarations() {
    const propertiesMockup = readMockupFile(`${mockupsPath}\\ModelProperty.txt`);
    const relationsToOneMockup = readMockupFile(`${mockupsPath}\\ModelToOne.txt`);
    const relationsToManyMockup = readMockupFile(`${mockupsPath}\\ModelToMany.txt`);
    
    return getDeclarions(propertiesMockup, relationsToOneMockup, relationsToManyMockup);
}

function getEntityDeclarations() {
    const propertiesMockup = readMockupFile(`${mockupsPath}\\EntityProperty.txt`);
    const relationsToOneMockup = readMockupFile(`${mockupsPath}\\EntityToOne.txt`);
    const relationsToManyMockup = readMockupFile(`${mockupsPath}\\EntityToMany.txt`);

    return getDeclarions(propertiesMockup, relationsToOneMockup, relationsToManyMockup);
}

function getDeclarions(propertiesMockup, relationsToOneMockup, relationsToManyMockup) {
    let declarations = '';
    
    for (const property of properties)
        declarations += replaceAllProperty(propertiesMockup, property);

    for (const relation of relations) {
        if(relation.size.endsWith(1))
            declarations += replaceAllRelation(relationsToOneMockup, relation);
        else
            declarations += replaceAllRelation(relationsToManyMockup, relation);
    }

    return declarations;
}

function getMapperDeclaration() {
    return `
            ${getMapper()}
                .ReverseMap()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
            `
}

function getMapper() {
    return `CreateMap<${serviceName}Entity, ${serviceName}>()`;
}

function snakeAndUpperCase(name) {
    let nameUnderscored = name;
    for(let i=1; i < nameUnderscored.length - 1; i++) {
        if (nameUnderscored[i] >= 'A' && nameUnderscored[i] <= 'Z') {
            nameUnderscored = nameUnderscored.substring(0, i) + '_' + nameUnderscored.substring(i);
            i++;
        }
    }
    return nameUnderscored.toUpperCase();
}

function removeAllSpaces(str) {
    return str.replace(/\s/g, '');
}

function addBeforeIfNotPresent(content, newContent, query) {
    if (isPresent(content, newContent))
        return content;

    queryIndex = content.indexOf(query);
    if (queryIndex < 0)
        return content;
    return content.substring(0, queryIndex) + newContent + content.substring(queryIndex);
}

function addAfterIfNotPresent(content, newContent, query, reference) {
    if (isPresent(content, newContent))
        return content;

    queryIndex = content.indexOf(query);
    referenceIndex = content.indexOf(reference, queryIndex);
    if (queryIndex < 0 || referenceIndex < 0)
        return content;
    return content.substring(0, referenceIndex + reference.length) + newContent + content.substring(referenceIndex + reference.length);
}

function isPresent(content, query) {
    return removeAllSpaces(content).includes(removeAllSpaces(query));
}

function getRelationTableName(name, foreignName, table) {
    if (table && table.length > 0)
        return `${snakeAndUpperCase(table)}`;
    else
        return `${snakeAndUpperCase(foreignName)}_HAVE_${snakeAndUpperCase(name)}`;
}

function relationIsModeled(relation, content) {
    const query1 = getRelationTableName(relation.name, relation.foreignName, relation.table);
    const query2 = getRelationTableName(relation.foreignName, relation.name, relation.table);
    return content.includes(query1) || content.includes(query2);
}

module.exports = {
    createService,
    writeNewContext
}