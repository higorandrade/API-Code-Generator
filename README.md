# API Code Generator

This is a script to automatically generate files (and directories) to create new .NET projects, database entities and endpoints.

## Prerequisites

- [Node.js](<https://nodejs.org/en/download/>) (~16.0)
- [.NET SDK](<https://dotnet.microsoft.com/en-us/download>) (8.0)
- Entity Framework (^5.0)

```bash
dotnet tool install --global dotnet-ef
```

## Json File

You should provide a path to a valid json file containing project information.
The JSON must follow the structure:

```json
{
    "projectName": "name of the project",
    "projectPath": "path to the project",
    "connection": {
      "host": "database host",
      "database": "database name",
      "username": "database username",
      "password": "database password"
    },
    "services": [
        {
          "name": "Name of the Entity",
          "properties": [
            {
              "name": "Name of the property",
              "type": "A valid C# type (such as int/long/float/double/bool/string/DateTime)",
              "required": true 
            }
          ],
          "relations": [
            {
              "name": "Name of the object that represents the relation",
              "type": "An object type",
              "foreignName": "Name of representation of this entity in the related object class",
              "table": "Optional name of the table that represents the relation (in case of N:M relations)",
              "size": "N:M"
            }
          ]
        }
    ]
}
```

Valid size options for relations are:
- 0:1 - Relation to up to 1 element
- N:1 - Relation to at least 1 element
- 1:N - Relation of 1 element to many elements
- N:M - Relation of many elements to many elements

## How to Run

1. Make sure to have all [prerequisites](#prerequisites) installed
2. Go to the Core directory

```bash
cd core
```

3. Start application providing a path to the json file via --file flag


```bash
node run.js --file="../demo.json"
```

You can opt to use the -c flag to create the project from scratch

```bash
node run.js -c --file="../demo.json"
```

## Target project structure

The target projects must/will follow the structure:

```text
.
├── Project.API/
|   ├── Business/
|   |   └─ Interfaces/
|   ├── Controllers/
|   └── Project.API.csproj
├── Project.Domain/
|   ├── Model/
|   └── Project.Domain.csproj
└── Project.Infra/
    ├── Entities/
    ├── Mapper/
    |   └─ DefaultMapper.cs
    ├── Repository/
    |   └─ Interfaces/
    ├── ProjectContext.cs
    └── Project.Infra.csproj
```