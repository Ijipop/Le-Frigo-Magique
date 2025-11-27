import { logger } from "./logger";

const FLIPP_BASE_URL = "https://backflipp.wishabi.com/flipp";

/**
 * Récupère les items (deals) d'un flyer depuis l'API Flipp
 * Essaie plusieurs variantes d'endpoints car l'API peut avoir changé
 */
export async function getFlyerItems(
  flyerId: number | string,
  flyerRunId?: number | string,
  path?: string
): Promise<{
  items: Array<{
    id: any;
    name: string;
    description: string;
    current_price: number | null;
    original_price: number | null;
    image_url: string | null;
    category: string | null;
  }>;
  error?: string;
}> {
  // Essayer plusieurs variantes d'URL
  const urlsToTry = [
    `${FLIPP_BASE_URL}/flyer/${flyerId}?locale=fr`,
    `${FLIPP_BASE_URL}/flyers/${flyerId}?locale=fr`,
  ];

  // Si on a flyer_run_id, l'essayer aussi
  if (flyerRunId) {
    urlsToTry.push(`${FLIPP_BASE_URL}/flyer/${flyerRunId}?locale=fr`);
    urlsToTry.push(`${FLIPP_BASE_URL}/flyers/${flyerRunId}?locale=fr`);
  }

  for (const urlStr of urlsToTry) {
    try {
      const url = new URL(urlStr);
      logger.debug(`Essai URL: ${url.toString()}`, { url: url.toString(), flyerId });

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      logger.debug(`Réponse pour ${url.toString()}`, { url: url.toString(), status: res.status });

      if (res.ok) {
        const data = await res.json();
        const rawItems: any[] =
          (data as any).items ||
          (data as any).clippings ||
          [];

        if (rawItems.length > 0) {
          logger.info(`Items trouvés avec ${url.toString()}`, { 
            url: url.toString(), 
            itemsCount: rawItems.length,
            flyerId 
          });
          
          // Log la structure du premier item pour déboguer
          if (rawItems[0]) {
            logger.debug(`Structure du premier item`, {
              keys: Object.keys(rawItems[0]),
              sample: JSON.stringify(rawItems[0]).substring(0, 500),
            });
          }
          
          const items = rawItems.map((item: any) => {
            const name = item.name || item.brand || "";
            
            // Fonction helper pour extraire un prix (peut être dans un objet imbriqué)
            const extractPrice = (obj: any, ...paths: string[]): number | null => {
              for (const path of paths) {
                // Essayer le chemin direct
                let value = obj[path];
                if (value !== undefined && value !== null) {
                  const num = typeof value === 'string' ? parseFloat(value) : value;
                  if (!isNaN(num) && num > 0) return num;
                }
                
                // Essayer avec des variations (camelCase, snake_case, etc.)
                const variations = [
                  path,
                  path.replace(/_/g, ''),
                  path.replace(/([A-Z])/g, '_$1').toLowerCase(),
                ];
                
                for (const variant of variations) {
                  value = obj[variant];
                  if (value !== undefined && value !== null) {
                    const num = typeof value === 'string' ? parseFloat(value) : value;
                    if (!isNaN(num) && num > 0) return num;
                  }
                }
                
                // Chercher dans des objets imbriqués (price.current, price.original, etc.)
                if (obj.price && typeof obj.price === 'object') {
                  value = obj.price[path] || obj.price[path.replace(/_/g, '')];
                  if (value !== undefined && value !== null) {
                    const num = typeof value === 'string' ? parseFloat(value) : value;
                    if (!isNaN(num) && num > 0) return num;
                  }
                }
              }
              return null;
            };
            
            // Essayer plusieurs champs possibles pour les prix
            const currentPrice = extractPrice(
              item,
              'current_price', 'price', 'currentPrice', 'sale_price', 'selling_price',
              'price_current', 'price_sale', 'salePrice', 'currentPrice'
            );
            
            const originalPrice = extractPrice(
              item,
              'original_price', 'was_price', 'originalPrice', 'regular_price', 'list_price',
              'price_original', 'price_regular', 'regularPrice', 'originalPrice', 'wasPrice'
            );
            
            // Chercher le prix régulier dans text_areas (peut contenir "was $X.XX" ou "reg $X.XX")
            let foundOriginalPrice = originalPrice;
            if (!foundOriginalPrice && item.text_areas && Array.isArray(item.text_areas)) {
              for (const textArea of item.text_areas) {
                const text = (textArea.text || textArea.content || "").toLowerCase();
                // Chercher des patterns comme "was $5.99", "reg $5.99", "was 5.99", etc.
                const wasMatch = text.match(/(?:was|était|prix régulier|prix reg|reg)\s*\$?\s*(\d+\.?\d*)/);
                const regMatch = text.match(/(?:prix régulier|prix reg|reg|regular)\s*\$?\s*(\d+\.?\d*)/);
                if (wasMatch || regMatch) {
                  const priceStr = (wasMatch || regMatch)![1];
                  const priceNum = parseFloat(priceStr);
                  if (!isNaN(priceNum) && priceNum > 0) {
                    foundOriginalPrice = priceNum;
                    break;
                  }
                }
              }
            }
            
            // Si on a un discount en pourcentage, calculer le prix régulier
            // Le champ discount est un nombre (ex: 13 = 13%, 39 = 39%)
            if (!foundOriginalPrice && item.discount != null && currentPrice) {
              const discountValue = typeof item.discount === 'number' 
                ? item.discount 
                : parseFloat(String(item.discount));
              
              if (!isNaN(discountValue) && discountValue > 0 && discountValue < 100) {
                // Prix régulier = prix actuel / (1 - pourcentage/100)
                // Exemple: prix actuel = 6.97, discount = 13%
                // Prix régulier = 6.97 / (1 - 13/100) = 6.97 / 0.87 = 8.01
                foundOriginalPrice = currentPrice / (1 - discountValue / 100);
                // Arrondir à 2 décimales
                foundOriginalPrice = Math.round(foundOriginalPrice * 100) / 100;
              }
            }
            
            // Log si on n'a pas trouvé de prix régulier pour déboguer
            if (!foundOriginalPrice && currentPrice && rawItems.indexOf(item) < 5) {
              logger.debug(`Pas de prix régulier pour "${name}"`, {
                itemName: name,
                hasDiscount: item.discount != null,
                discount: item.discount,
                currentPrice,
                hasTextAreas: item.text_areas && item.text_areas.length > 0,
                textAreasCount: item.text_areas?.length || 0,
              });
            }
            
            // Log le premier item pour déboguer
            if (rawItems.indexOf(item) === 0) {
              logger.debug(`Structure du premier item (détaillée)`, {
                keys: Object.keys(item),
                priceFields: {
                  current_price: item.current_price,
                  price: item.price,
                  currentPrice: item.currentPrice,
                  sale_price: item.sale_price,
                  original_price: item.original_price,
                  was_price: item.was_price,
                  originalPrice: item.originalPrice,
                  regular_price: item.regular_price,
                  list_price: item.list_price,
                  discount: item.discount,
                  text_areas: item.text_areas,
                },
                extractedPrices: {
                  current: currentPrice,
                  original: foundOriginalPrice,
                },
              });
            }
            
            return {
              id: item.id,
              name,
              description: item.description || "",
              current_price: currentPrice,
              original_price: foundOriginalPrice,
              image_url: item.image_url || item.flyer_image || item.imageUrl || null,
              category: item.category || null,
              brand: item.brand || null,
              print_id: item.print_id || null,
            };
          });
          
          // Log quelques exemples d'items avec prix
          const itemsWithPrice = items.filter(i => i.current_price || i.original_price);
          logger.debug(`Items avec prix: ${itemsWithPrice.length}/${items.length}`, {
            itemsWithPrice: itemsWithPrice.length,
            totalItems: items.length,
            sampleItems: itemsWithPrice.slice(0, 3).map(i => ({ 
              name: i.name, 
              current: i.current_price, 
              original: i.original_price 
            }))
          });
          
          return { items };
        }
      } else {
        const text = await res.text();
        logger.warn(`${url.toString()} retourne ${res.status}`, { 
          url: url.toString(), 
          status: res.status,
          responsePreview: text.substring(0, 100) 
        });
      }
    } catch (err) {
      logger.warn(`Erreur avec ${urlStr}`, { 
        url: urlStr, 
        error: err instanceof Error ? err.message : String(err) 
      });
      continue;
    }
  }

  // Si aucune URL n'a fonctionné
  logger.error(`Aucune URL n'a fonctionné pour flyer ${flyerId}`, undefined, { flyerId });
  return { items: [], error: "Toutes les URLs ont échoué" };
}
