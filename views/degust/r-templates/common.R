{{> libraries}}

count_cols <- {{{columns}}}
x<-read.delim('{{{counts_file}}}',skip={{counts_skip}}, sep="{{{sep_char}}}", check.names=FALSE, colClasses='character', na.strings=c())
x[,count_cols] <- apply(x[,count_cols], 2, function(v) as.numeric(v))     # Force numeric count columns
counts <- x[, count_cols]
keepMin <- apply(counts, 1, max) >= {{min_counts}}
keepCpm <- rowSums(cpm(counts)>{{min_cpm}}) >= {{min_cpm_samples}}                  # Keep only genes with cpm above x in at least y samples
keep <- keepMin & keepCpm
x <- x[keep,]
counts <- counts[keep,]
design <- {{{design}}}
