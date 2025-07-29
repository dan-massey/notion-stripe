import type { HandlerContext } from "./types";

export async function handleNotionError(
  error: unknown,
  context: HandlerContext,
  databaseType: 'customer' | 'invoice' | 'charge' | 'subscription' | 'credit_note' | 'dispute' | 'invoiceitem' | 'line_item' | 'price' | 'product' | 'promotion_code' | 'payment_intent'
): Promise<void> {
  let errorMessage = 'Unknown Notion API error';
  let errorField: 'tokenError' | typeof databaseType = databaseType;
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Try to extract JSON from error message that follows pattern: "Error: Notion API error: 400 Bad Request - {JSON}"
    const jsonMatch = errorMessage.match(/\s-\s({.*})$/);
    if (jsonMatch) {
      try {
        const errorObj = JSON.parse(jsonMatch[1]);
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        // Check if it's a token-related error based on code or status
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // If JSON parsing fails, try direct JSON parse of full message
        try {
          const errorObj = JSON.parse(errorMessage);
          if (errorObj.message) {
            errorMessage = errorObj.message;
          }
          
          if (errorObj.code === 'unauthorized' || 
              errorObj.code === 'invalid_grant' || 
              errorObj.status === 401) {
            errorField = 'tokenError';
          }
        } catch {
          // Fall back to string matching
          if (errorMessage.includes('invalid_grant') || 
              errorMessage.includes('unauthorized') ||
              errorMessage.includes('API token is invalid') ||
              errorMessage.includes('401')) {
            errorField = 'tokenError';
          }
        }
      }
    } else {
      // Try direct JSON parse if no pattern match
      try {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
    
    // Try to extract JSON from error string
    const jsonMatch = errorMessage.match(/\s-\s({.*})$/);
    if (jsonMatch) {
      try {
        const errorObj = JSON.parse(jsonMatch[1]);
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    } else {
      // Try direct JSON parse
      try {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    }
  }
  
  console.error(`Notion API error for ${databaseType}:`, errorMessage);
  
  if (errorField === 'tokenError') {
    await context.account.setTokenError(errorMessage);
  } else {
    // If it's a database error, the token must be valid, so clear any token error
    await context.account.setTokenError(null);
    await context.account.setEntityError(errorField, errorMessage);
  }
}