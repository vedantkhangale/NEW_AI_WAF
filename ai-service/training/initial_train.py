"""
Initial model training
Generates synthetic training data and trains baseline LightGBM model
"""

import lightgbm as lgb
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from loguru import logger
import os


def generate_synthetic_data(n_samples: int = 10000) -> pd.DataFrame:
    """
    Generate synthetic training data
    In production, replace with real attack/benign data
    """
    logger.info(f"Generating {n_samples} synthetic training samples...")
    
    np.random.seed(42)
    
    data = []
    
    # Generate benign requests (70%)
    n_benign = int(n_samples * 0.7)
    for _ in range(n_benign):
        sample = {
            'method_is_post': np.random.choice([0, 1], p=[0.6, 0.4]),
            'method_is_get': np.random.choice([0, 1], p=[0.4, 0.6]),
            'uri_length': np.random.randint(5, 50),
            'query_length': np.random.randint(0, 100),
            'body_length': np.random.randint(0, 200),
            'total_length': np.random.randint(10, 300),
            'path_depth': np.random.randint(1, 5),
            'has_query': np.random.choice([0, 1], p=[0.3, 0.7]),
            'num_params': np.random.randint(0, 5),
            'url_encoded_chars': np.random.randint(0, 3),
            'hex_encoded_chars': 0,
            'unicode_chars': 0,
            'non_ascii_ratio': np.random.uniform(0, 0.05),
            'entropy': np.random.uniform(2.0, 4.5),
            'uri_entropy': np.random.uniform(2.0, 4.0),
            'sql_keyword_count': 0,
            'sql_keyword_density': 0.0,
            'has_sql_comment': 0,
            'has_union': 0,
            'has_select': 0,
            'has_quotes': np.random.randint(0, 2),
            'xss_pattern_count': 0,
            'has_script_tag': 0,
            'has_javascript': 0,
            'has_event_handler': 0,
            'html_tag_count': 0,
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(0, 5),
            'special_char_ratio': np.random.uniform(0, 0.1),
            'user_agent_length': np.random.randint(80, 200),
            'has_user_agent': 1,
            'suspicious_user_agent': 0,
            'ip_reputation': np.random.uniform(0.5, 1.0),
            'geo_risk': 0.3,
            'label': 0  # Benign
        }
        data.append(sample)
    
    # Generate SQL Injection attacks (10%)
    n_sqli = int(n_samples * 0.1)
    for _ in range(n_sqli):
        sample = {
            'method_is_post': 1,
            'method_is_get': 0,
            'uri_length': np.random.randint(20, 150),
            'query_length': np.random.randint(50, 300),
            'body_length': np.random.randint(30, 200),
            'total_length': np.random.randint(100, 500),
            'path_depth': np.random.randint(1, 4),
            'has_query': 1,
            'num_params': np.random.randint(2, 8),
            'url_encoded_chars': np.random.randint(5, 30),
            'hex_encoded_chars': np.random.randint(0, 5),
            'unicode_chars': 0,
            'non_ascii_ratio': np.random.uniform(0, 0.1),
            'entropy': np.random.uniform(4.0, 6.0),
            'uri_entropy': np.random.uniform(4.0, 5.5),
            'sql_keyword_count': np.random.randint(3, 15),
            'sql_keyword_density': np.random.uniform(0.1, 0.4),
            'has_sql_comment': np.random.choice([0, 1], p=[0.3, 0.7]),
            'has_union': np.random.choice([0, 1], p=[0.5, 0.5]),
            'has_select': 1,
            'has_quotes': np.random.randint(5, 20),
            'xss_pattern_count': 0,
            'has_script_tag': 0,
            'has_javascript': 0,
            'has_event_handler': 0,
            'html_tag_count': 0,
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(10, 40),
            'special_char_ratio': np.random.uniform(0.1, 0.3),
            'user_agent_length': np.random.randint(60, 150),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.7, 0.3]),
            'ip_reputation': np.random.uniform(0.0, 0.5),
            'geo_risk': 0.7,
            'label': 1  # Malicious
        }
        data. append(sample)
    
    # Generate XSS attacks (10%)
    n_xss = int(n_samples * 0.1)
    for _ in range(n_xss):
        sample = {
            'method_is_post': np.random.choice([0, 1]),
            'method_is_get': np.random.choice([0, 1]),
            'uri_length': np.random.randint(30, 200),
            'query_length': np.random.randint(40, 300),
            'body_length': np.random.randint(20, 150),
            'total_length': np.random.randint(80, 500),
            'path_depth': np.random.randint(1, 4),
            'has_query': 1,
            'num_params': np.random.randint(1, 6),
            'url_encoded_chars': np.random.randint(3, 20),
            'hex_encoded_chars': 0,
            'unicode_chars': np.random.randint(0, 5),
            'non_ascii_ratio': np.random.uniform(0, 0.05),
            'entropy': np.random.uniform(4.5, 6.5),
            'uri_entropy': np.random.uniform(4.0, 5.5),
            'sql_keyword_count': 0,
            'sql_keyword_density': 0.0,
            'has_sql_comment': 0,
            'has_union': 0,
            'has_select': 0,
            'has_quotes': np.random.randint(2, 10),
            'xss_pattern_count': np.random.randint(1, 5),
            'has_script_tag': np.random.choice([0, 1], p=[0.3, 0.7]),
            'has_javascript': np.random.choice([0, 1], p=[0.5, 0.5]),
            'has_event_handler': np.random.choice([0, 1], p=[0.4, 0.6]),
            'html_tag_count': np.random.randint(1, 10),
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(5, 25),
            'special_char_ratio': np.random.uniform(0.05, 0.2),
            'user_agent_length': np.random.randint(70, 180),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.8, 0.2]),
            'ip_reputation': np.random.uniform(0.1, 0.6),
            'geo_risk': 0.5,
            'label': 1  # Malicious
        }
        data.append(sample)
    
    # Generate Path Traversal attacks (10%)
    n_path = int(n_samples * 0.1)
    for _ in range(n_path):
        sample = {
            'method_is_post': 0,
            'method_is_get': 1,
            'uri_length': np.random.randint(40, 250),
            'query_length': np.random.randint(20, 150),
            'body_length': 0,
            'total_length': np.random.randint(60, 350),
            'path_depth': np.random.randint(5, 15),
            'has_query': np.random.choice([0, 1]),
            'num_params': np.random.randint(0, 4),
            'url_encoded_chars': np.random.randint(10, 40),
            'hex_encoded_chars': 0,
            'unicode_chars': 0,
            'non_ascii_ratio': 0.0,
            'entropy': np.random.uniform(3.5, 5.0),
            'uri_entropy': np.random.uniform(3.5, 5.0),
            'sql_keyword_count': 0,
            'sql_keyword_density': 0.0,
            'has_sql_comment': 0,
            'has_union': 0,
            'has_select': 0,
            'has_quotes': 0,
            'xss_pattern_count': 0,
            'has_script_tag': 0,
            'has_javascript': 0,
            'has_event_handler': 0,
            'html_tag_count': 0,
            'has_dot_dot': 1,
            'path_traversal_count': np.random.randint(3, 20),
            'has_file_protocol': np.random.choice([0, 1], p=[0.6, 0.4]),
            'special_char_count': np.random.randint(15, 50),
            'special_char_ratio': np.random.uniform(0.2, 0.4),
            'user_agent_length': np.random.randint(50, 120),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.5, 0.5]),
            'ip_reputation': np.random.uniform(0.0, 0.4),
            'geo_risk': 0.6,
            'label': 1  # Malicious
        }
        data.append(sample)
    
    df = pd.DataFrame(data)
    logger.info(f"Generated {len(df)} samples: {(df['label']==0).sum()} benign, {(df['label']==1).sum()} malicious")
    
    return df


def train_initial_model(output_path: str):
    """Train initial LightGBM model"""
    logger.info("Training initial LightGBM model...")
    
    # Generate synthetic data
    df = generate_synthetic_data(n_samples=10000)
    
    # Split features and labels
    X = df.drop('label', axis=1)
    y = df['label']
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info(f"Training set: {len(X_train)}, Test set: {len(X_test)}")
    
    # Create LightGBM dataset
    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    # Parameters optimized for speed and accuracy
    params = {
        'objective': 'binary',
        'metric': 'binary_logloss',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'max_depth': 6
    }
    
    # Train model
    logger.info("Training in progress...")
    model = lgb.train(
        params,
        train_data,
        num_boost_round=100,
        valid_sets=[train_data, test_data],
        valid_names=['train', 'test'],
        callbacks=[lgb.early_stopping(stopping_rounds=10), lgb.log_evaluation(period=10)]
    )
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_binary = (y_pred > 0.5).astype(int)
    
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    
    accuracy = accuracy_score(y_test, y_pred_binary)
    precision = precision_score(y_test, y_pred_binary)
    recall = recall_score(y_test, y_pred_binary)
    f1 = f1_score(y_test, y_pred_binary)
    
    logger.info(f"Model performance:")
    logger.info(f"  Accuracy:  {accuracy:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall:.4f}")
    logger.info(f"  F1 Score:  {f1:.4f}")
    
    # Save model
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    model_data = {
        'model': model,
        'feature_names': list(X.columns),
        'metrics': {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1
        }
    }
    
    joblib.dump(model_data, output_path)
    logger.info(f"Model saved to {output_path}")
    
    return model


if __name__ == "__main__":
    train_initial_model("/app/models/lgbm_waf_model.pkl")
