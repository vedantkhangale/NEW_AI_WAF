"""
Enterprise-Grade Model Training
Generates realistic training data reflecting modern web attacks to prevent length-based bias.
"""

import lightgbm as lgb
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from loguru import logger
import os
import random

def generate_synthetic_data(n_samples: int = 20000) -> pd.DataFrame:
    logger.info(f"Generating {n_samples} high-quality synthetic training samples...")
    np.random.seed(42)
    random.seed(42)
    data = []
    
    # 1. Benign Traffic (60%)
    n_benign = int(n_samples * 0.6)
    for _ in range(n_benign):
        # Benign can be long or short
        length = np.random.randint(10, 500)
        data.append({
            'method_is_post': np.random.choice([0, 1]),
            'method_is_get': np.random.choice([0, 1]),
            'uri_length': np.random.randint(5, 100),
            'query_length': length // 2,
            'body_length': length // 2,
            'total_length': length,
            'path_depth': np.random.randint(1, 6),
            'has_query': np.random.choice([0, 1], p=[0.2, 0.8]),
            'num_params': np.random.randint(0, 10),
            'url_encoded_chars': np.random.randint(0, 5),
            'hex_encoded_chars': 0,
            'unicode_chars': 0,
            'non_ascii_ratio': np.random.uniform(0, 0.01),
            'entropy': np.random.uniform(3.0, 4.5),
            'uri_entropy': np.random.uniform(3.0, 4.5),
            'sql_keyword_count': np.random.choice([0, 1], p=[0.95, 0.05]), # Sometimes natural language has "select"
            'sql_keyword_density': 0.0,
            'has_sql_comment': 0,
            'has_union': 0,
            'has_select': np.random.choice([0, 1], p=[0.95, 0.05]),
            'has_quotes': np.random.randint(0, 3),
            'xss_pattern_count': 0,
            'has_script_tag': 0,
            'has_javascript': 0,
            'has_event_handler': 0,
            'html_tag_count': np.random.choice([0, 1, 2], p=[0.9, 0.05, 0.05]),
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(0, 10),
            'special_char_ratio': np.random.uniform(0, 0.05),
            'user_agent_length': np.random.randint(50, 150),
            'has_user_agent': 1,
            'suspicious_user_agent': 0,
            'ip_reputation': np.random.uniform(0.7, 1.0),
            'geo_risk': np.random.uniform(0.0, 0.3),
            'label': 0
        })

    # 2. Short, Lethal SQLi (15%) - Avoid length bias
    n_sqli = int(n_samples * 0.15)
    for _ in range(n_sqli):
        length = np.random.randint(10, 50) # Short payloads!
        data.append({
            'method_is_post': np.random.choice([0, 1]),
            'method_is_get': np.random.choice([0, 1]),
            'uri_length': np.random.randint(10, 50),
            'query_length': length,
            'body_length': 0,
            'total_length': length,
            'path_depth': 1,
            'has_query': 1,
            'num_params': 1,
            'url_encoded_chars': np.random.randint(0, 10),
            'hex_encoded_chars': np.random.choice([0, 1]),
            'unicode_chars': 0,
            'non_ascii_ratio': np.random.uniform(0, 0.1),
            'entropy': np.random.uniform(2.5, 4.0),
            'uri_entropy': np.random.uniform(2.5, 4.0),
            'sql_keyword_count': np.random.randint(1, 4),
            'sql_keyword_density': np.random.uniform(0.1, 0.5),
            'has_sql_comment': 1,
            'has_union': np.random.choice([0, 1]),
            'has_select': np.random.choice([0, 1]),
            'has_quotes': np.random.randint(1, 5),
            'xss_pattern_count': 0,
            'has_script_tag': 0,
            'has_javascript': 0,
            'has_event_handler': 0,
            'html_tag_count': 0,
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(2, 10),
            'special_char_ratio': np.random.uniform(0.1, 0.5), # High density of special chars
            'user_agent_length': np.random.randint(50, 150),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.7, 0.3]),
            'ip_reputation': np.random.uniform(0.0, 0.5),
            'geo_risk': np.random.uniform(0.5, 1.0),
            'label': 1
        })

    # 3. Modern XSS and Obfuscated Payloads (15%)
    n_xss = int(n_samples * 0.15)
    for _ in range(n_xss):
        length = np.random.randint(20, 100)
        data.append({
            'method_is_post': np.random.choice([0, 1]),
            'method_is_get': np.random.choice([0, 1]),
            'uri_length': np.random.randint(20, 80),
            'query_length': length,
            'body_length': 0,
            'total_length': length,
            'path_depth': 2,
            'has_query': 1,
            'num_params': 1,
            'url_encoded_chars': np.random.randint(5, 30),
            'hex_encoded_chars': np.random.randint(0, 5),
            'unicode_chars': np.random.randint(0, 5),
            'non_ascii_ratio': np.random.uniform(0, 0.2),
            'entropy': np.random.uniform(4.0, 5.5),
            'uri_entropy': np.random.uniform(4.0, 5.5),
            'sql_keyword_count': 0,
            'sql_keyword_density': 0.0,
            'has_sql_comment': 0,
            'has_union': 0,
            'has_select': 0,
            'has_quotes': np.random.randint(1, 6),
            'xss_pattern_count': np.random.randint(1, 4),
            'has_script_tag': np.random.choice([0, 1]),
            'has_javascript': 1,
            'has_event_handler': np.random.choice([0, 1]),
            'html_tag_count': np.random.randint(1, 5),
            'has_dot_dot': 0,
            'path_traversal_count': 0,
            'has_file_protocol': 0,
            'special_char_count': np.random.randint(5, 20),
            'special_char_ratio': np.random.uniform(0.1, 0.4),
            'user_agent_length': np.random.randint(50, 150),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.6, 0.4]),
            'ip_reputation': np.random.uniform(0.0, 0.6),
            'geo_risk': np.random.uniform(0.4, 1.0),
            'label': 1
        })

    # 4. Path Traversal & LFI (10%)
    n_lfi = int(n_samples * 0.10)
    for _ in range(n_lfi):
        length = np.random.randint(20, 80)
        data.append({
            'method_is_post': 0,
            'method_is_get': 1,
            'uri_length': length,
            'query_length': 0,
            'body_length': 0,
            'total_length': length,
            'path_depth': np.random.randint(5, 15),
            'has_query': 0,
            'num_params': 0,
            'url_encoded_chars': np.random.randint(0, 15),
            'hex_encoded_chars': 0,
            'unicode_chars': 0,
            'non_ascii_ratio': 0.0,
            'entropy': np.random.uniform(3.0, 4.5),
            'uri_entropy': np.random.uniform(3.0, 4.5),
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
            'path_traversal_count': np.random.randint(2, 10),
            'has_file_protocol': np.random.choice([0, 1]),
            'special_char_count': np.random.randint(5, 15),
            'special_char_ratio': np.random.uniform(0.1, 0.3),
            'user_agent_length': np.random.randint(50, 120),
            'has_user_agent': 1,
            'suspicious_user_agent': np.random.choice([0, 1], p=[0.5, 0.5]),
            'ip_reputation': np.random.uniform(0.0, 0.4),
            'geo_risk': np.random.uniform(0.6, 1.0),
            'label': 1
        })

    df = pd.DataFrame(data)
    logger.info(f"Generated {len(df)} samples.")
    return df

def train_initial_model(output_path: str):
    logger.info("Training enterprise-grade LightGBM model...")
    df = generate_synthetic_data(n_samples=25000)
    
    X = df.drop('label', axis=1)
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    params = {
        'objective': 'binary',
        'metric': 'binary_logloss',
        'boosting_type': 'gbdt',
        'num_leaves': 63, # Higher capacity
        'learning_rate': 0.03, # Slower, better generalization
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'max_depth': 8, # Deeper trees for complex non-linear combinations
        'min_data_in_leaf': 20
    }
    
    model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[train_data, test_data],
        valid_names=['train', 'test'],
        callbacks=[lgb.early_stopping(stopping_rounds=20), lgb.log_evaluation(period=20)]
    )
    
    y_pred = model.predict(X_test)
    y_pred_binary = (y_pred > 0.5).astype(int)
    
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    accuracy = accuracy_score(y_test, y_pred_binary)
    precision = precision_score(y_test, y_pred_binary)
    recall = recall_score(y_test, y_pred_binary)
    f1 = f1_score(y_test, y_pred_binary)
    
    logger.info(f"Model performance - Acc: {accuracy:.4f}, Prec: {precision:.4f}, Rec: {recall:.4f}, F1: {f1:.4f}")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump({
        'model': model,
        'feature_names': list(X.columns),
        'metrics': {'accuracy': accuracy, 'precision': precision, 'recall': recall, 'f1_score': f1}
    }, output_path)
    
    return model

if __name__ == "__main__":
    train_initial_model("/app/models/lgbm_waf_model.pkl")
