"""
LightGBM Threat Classifier
Fast gradient boosting for WAF threat detection
"""

import lightgbm as lgb
import joblib
import numpy as np
from typing import Dict, Any, Optional
from loguru import logger
import os


class ThreatClassifier:
    """LightGBM-based threat classifier"""
    
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model: Optional[lgb.Booster] = None
        self.feature_names = None
    
    def load_model(self):
        """Load trained model from disk"""
        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.feature_names = model_data['feature_names']
            logger.info(f"Model loaded from {self.model_path}")
            logger.info(f"Features: {len(self.feature_names)}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict threat probability for request
        Returns: {risk_score: float, reason: str}
        """
        if not self.model:
            return {
                'risk_score': 0.5,
                'reason': 'Model not loaded'
            }
        
        try:
            # Convert features dict to array in correct order
            feature_array = self._features_to_array(features)
            
            # Predict probability
            # For binary classification, predict_proba returns [prob_benign, prob_malicious]
            prediction = self.model.predict(feature_array)[0]
            
            # For regression/single output, use the value directly
            # LightGBM returns probability between 0 and 1
            risk_score = float(prediction)
            
            # Clamp to [0, 1]
            risk_score = max(0.0, min(1.0, risk_score))
            
            # Generate reason
            reason = self._generate_reason(risk_score, features)
            
            return {
                'risk_score': risk_score,
                'reason': reason
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {
                'risk_score': 0.0,
                'reason': f'Prediction error: {str(e)}'
            }
    
    def _features_to_array(self, features: Dict[str, Any]) -> np.ndarray:
        """Convert features dict to numpy array in correct order"""
        # Ensure all expected features are present
        feature_vector = []
        for feature_name in self.feature_names:
            value = features.get(feature_name, 0.0)
            feature_vector.append(float(value))
        
        return np.array([feature_vector])
    
    def _generate_reason(self, risk_score: float, features: Dict[str, Any]) -> str:
        """Generate human-readable reason for risk score"""
        if risk_score < 0.3:
            return "Request appears benign"
        elif risk_score < 0.5:
            return "Low risk detected - minor anomalies"
        elif risk_score < 0.7:
            return "Moderate risk - suspicious patterns detected"
        elif risk_score < 0.9:
            return "High risk - likely attack attempt"
        else:
            return "Critical threat - attack patterns confirmed"
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model"""
        if not self.model:
            return {"status": "not_loaded"}
        
        return {
            "status": "loaded",
            "model_type": "LightGBM",
            "num_features": len(self.feature_names),
            "feature_names": self.feature_names,
            "model_path": self.model_path
        }
