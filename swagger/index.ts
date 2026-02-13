import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

/**
 * Charge et fusionne les fichiers de documentation YAML Swagger
 */

// Chemins des fichiers de documentation
const swaggerDir = path.join(__dirname)
const configPath = path.join(swaggerDir, 'swagger.config.yml')
const authDocPath = path.join(swaggerDir, 'auth.doc.yml')
const cardDocPath = path.join(swaggerDir, 'card.doc.yml')
const deckDocPath = path.join(swaggerDir, 'deck.doc.yml')

/**
 * Charge un fichier YAML et le parse
 */
function loadYamlFile(filePath: string): any {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        return yaml.load(fileContent)
    } catch (error) {
        console.error(`Erreur lors du chargement de ${filePath}:`, error)
        return {}
    }
}

// Charger tous les fichiers de documentation
const swaggerConfig = loadYamlFile(configPath)
const authDoc = loadYamlFile(authDocPath)
const cardDoc = loadYamlFile(cardDocPath)
const deckDoc = loadYamlFile(deckDocPath)

// Fusionner les paths de tous les modules
const allPaths = {
    ...authDoc.paths,
    ...cardDoc.paths,
    ...deckDoc.paths,
}

// Créer la spécification OpenAPI complète
export const swaggerSpec = {
    ...swaggerConfig,
    paths: {
        ...allPaths,
        // Endpoint health check
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Vérifier l\'état du serveur',
                description: 'Endpoint de santé pour vérifier que le serveur fonctionne correctement.',
                operationId: 'healthCheck',
                responses: {
                    '200': {
                        description: 'Serveur opérationnel',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/HealthCheck'
                                },
                                examples: {
                                    success: {
                                        value: {
                                            status: 'ok',
                                            message: 'TCG Backend Server is running'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Options pour swagger-ui-express
 */
export const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TCG Pokemon API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        syntaxHighlight: {
            activate: true,
            theme: 'monokai'
        }
    }
}

// Log pour confirmer le chargement
console.log('📚 Documentation Swagger chargée avec succès')
console.log(`   - ${Object.keys(allPaths).length} endpoints documentés`)
console.log(`   - ${Object.keys(swaggerConfig.components?.schemas || {}).length} schémas définis`)
